package agent

import (
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"time"

	bolt "go.etcd.io/bbolt"
)

type Task struct {
	ID        string    `json:"id"`
	Principal string    `json:"principal"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Status    string    `json:"status"`
	Owner     string    `json:"owner"`
	DependsOn []string  `json:"depends_on"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (s *Service) deleteRecord(bucket, id string) error {
	return s.store.db.Update(func(tx *bolt.Tx) error { return tx.Bucket([]byte(bucket)).Delete([]byte(id)) })
}

func (s *Service) taskTool(ex *Execution, name string, a Args) (any, error) {
	items, err := records[Task](s.store, "tasks")
	if err != nil {
		return nil, err
	}
	owned := []Task{}
	for _, item := range items {
		if item.Principal == ex.Principal {
			owned = append(owned, item)
		}
	}
	if name == "task_list" {
		return owned, nil
	}
	var output Task
	err = s.store.db.Update(func(tx *bolt.Tx) error {
		if name == "task_create" {
			if a.Title == "" || len(a.Title) > 200 || len(owned) >= 100 {
				return errors.New("task title missing or task limit reached")
			}
			output = Task{ID: newID(), Principal: ex.Principal, Title: a.Title,
				Content: clip(a.Content, 4000), Status: "pending", DependsOn: []string{}, UpdatedAt: time.Now().UTC()}
		} else {
			if err := readRecord(tx, "tasks", a.ID, &output); err != nil {
				return err
			}
			if output.Principal != ex.Principal {
				return ErrNotFound
			}
		}
		if a.DependsOn != nil {
			if output.Status != "pending" {
				return errors.New("only pending tasks can change dependencies")
			}
			for _, id := range a.DependsOn {
				if id == output.ID {
					return errors.New("cyclic task dependency")
				}
				var dep Task
				if err := readRecord(tx, "tasks", id, &dep); err != nil || dep.Principal != ex.Principal {
					return errors.New("dependency not found")
				}
				if taskReaches(tx, id, output.ID, map[string]bool{}) {
					return errors.New("cyclic task dependency")
				}
			}
			output.DependsOn = slices.Clone(a.DependsOn)
		}
		if name == "task_claim" {
			if output.Status != "pending" {
				return errors.New("task already claimed")
			}
			a.Status = "in_progress"
			output.Owner = ex.Agent
		}
		if name == "task_complete" {
			if output.Owner != ex.Agent || output.Status != "in_progress" {
				return errors.New("task is not owned by this agent")
			}
			a.Status = "completed"
		}
		if a.Status != "" {
			switch a.Status {
			case "pending", "in_progress", "completed":
			default:
				return errors.New("invalid task status")
			}
			if a.Status != "pending" {
				for _, id := range output.DependsOn {
					var dep Task
					if err := readRecord(tx, "tasks", id, &dep); err != nil {
						return err
					}
					if dep.Status != "completed" {
						return fmt.Errorf("blocked by task %s", id)
					}
				}
			}
			if a.Status == "completed" && a.Content == "" {
				return errors.New("completion evidence required")
			}
			output.Status = a.Status
			if a.Status == "in_progress" && output.Owner == "" {
				output.Owner = ex.Agent
			}
			if a.Status == "pending" {
				output.Owner = ""
			}
		}
		if a.Content != "" {
			output.Content = clip(a.Content, 4000)
		}
		output.UpdatedAt = time.Now().UTC()
		return writeRecord(tx, "tasks", output.ID, output)
	})
	return output, err
}

func taskReaches(tx *bolt.Tx, start, target string, seen map[string]bool) bool {
	if start == target {
		return true
	}
	if seen[start] {
		return false
	}
	seen[start] = true
	var task Task
	if err := readRecord(tx, "tasks", start, &task); err != nil {
		return false
	}
	for _, id := range task.DependsOn {
		if taskReaches(tx, id, target, seen) {
			return true
		}
	}
	return false
}

func (s *Service) approve(ctxEx *Execution, id string, allow bool) (Approval, error) {
	var approval Approval
	err := s.store.db.Update(func(tx *bolt.Tx) error {
		if err := readRecord(tx, "approvals", id, &approval); err != nil {
			return err
		}
		if approval.Principal != ctxEx.Principal || approval.SessionID != ctxEx.SessionID {
			return ErrNotFound
		}
		if approval.Status != "pending" {
			return errors.New("approval already resolved")
		}
		if time.Since(approval.CreatedAt) > time.Hour {
			return errors.New("approval expired")
		}
		if s.tools[approval.Tool].Owner && !ctxEx.Owner {
			return errors.New("owner permission required")
		}
		approval.Status = "denied"
		if allow {
			approval.Status = "executing"
		}
		return writeRecord(tx, "approvals", id, approval)
	})
	if err != nil || !allow {
		return approval, err
	}
	call := ToolCall{ID: id, Function: FunctionCall{Name: approval.Tool, Arguments: string(approval.Arguments)}}
	approval.Result = s.execute(s.ctx, ctxEx, call, true)
	approval.Status = "approved"
	var result map[string]json.RawMessage
	if json.Unmarshal([]byte(approval.Result), &result) == nil && result["error"] != nil {
		approval.Status = "failed"
	}
	err = s.store.put("approvals", id, approval)
	return approval, err
}
