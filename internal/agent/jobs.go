package agent

import (
	"errors"
	"time"
	_ "time/tzdata"

	"github.com/robfig/cron/v3"
)

type Job struct {
	ID        string    `json:"id"`
	Principal string    `json:"principal"`
	SessionID string    `json:"session_id"`
	Prompt    string    `json:"prompt"`
	Goal      string    `json:"goal"`
	Cron      string    `json:"cron"`
	Status    string    `json:"status"`
	RunID     string    `json:"run_id"`
	NextAt    time.Time `json:"next_at"`
	LastError string    `json:"last_error,omitempty"`
}

func cronNext(spec string, now time.Time) (time.Time, error) {
	schedule, err := cron.ParseStandard(spec)
	if err != nil {
		return time.Time{}, errors.New("invalid five-field cron expression")
	}
	location, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		return time.Time{}, err
	}
	next := schedule.Next(now.In(location))
	if next.IsZero() {
		return time.Time{}, errors.New("cron has no next occurrence")
	}
	return next.UTC(), nil
}

func (s *Service) jobTool(ex *Execution, name string, a Args) (any, error) {
	items, err := records[Job](s.store, "jobs")
	if err != nil {
		return nil, err
	}
	owned := []Job{}
	for _, item := range items {
		if item.Principal == ex.Principal {
			owned = append(owned, item)
		}
	}
	if name == "job_list" {
		return owned, nil
	}
	if name == "job_cancel" {
		var job Job
		if err := s.store.get("jobs", a.ID, &job); err != nil || job.Principal != ex.Principal {
			return nil, ErrNotFound
		}
		job.Status = "cancelled"
		if job.RunID != "" {
			_ = s.Cancel(ex.Principal, job.RunID)
		}
		return job, s.store.put("jobs", job.ID, job)
	}
	if a.Prompt == "" || len(a.Prompt) > 8000 {
		return nil, errors.New("job prompt must be 1-8000 bytes")
	}
	active := 0
	for _, item := range owned {
		if item.Status == "active" {
			active++
		}
	}
	if active >= 10 {
		return nil, errors.New("active job limit reached")
	}
	job := Job{ID: newID(), Principal: ex.Principal, Prompt: a.Prompt, Goal: a.Goal,
		Status: "active", NextAt: time.Now().UTC()}
	if name == "schedule_cron" {
		job.Cron = a.Cron
		job.NextAt, err = cronNext(a.Cron, time.Now())
		if err != nil {
			return nil, err
		}
	}
	session, err := s.createSession(ex.Principal)
	if err != nil {
		return nil, err
	}
	job.SessionID = session.ID
	return job, s.store.put("jobs", job.ID, job)
}

func (s *Service) scheduler() {
	defer s.wg.Done()
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-s.ctx.Done():
			return
		case now := <-ticker.C:
			s.tickJobs(now)
		}
	}
}

func (s *Service) tickJobs(now time.Time) {
	jobs, err := records[Job](s.store, "jobs")
	if err != nil {
		return
	}
	for _, job := range jobs {
		if job.Status != "active" {
			continue
		}
		if job.RunID != "" {
			var run Run
			if s.store.get("runs", job.RunID, &run) == nil && run.Status == "running" {
				continue
			}
			if job.Cron == "" {
				job.Status = "completed"
				_ = s.store.put("jobs", job.ID, job)
				continue
			}
		}
		if job.NextAt.After(now) {
			continue
		}
		// Persist an in-flight claim before starting. On restart, retry at least once;
		// tools that affect outside systems still require a separate approval.
		job.NextAt = now.Add(time.Minute)
		if s.store.put("jobs", job.ID, job) != nil {
			continue
		}
		run, err := s.Start(job.Principal, job.SessionID, ChatInput{Message: job.Prompt, Goal: job.Goal}, true)
		if err != nil {
			job.LastError = s.cfg.redact(err.Error())
			_ = s.store.put("jobs", job.ID, job)
			continue
		}
		job.RunID = run.ID
		job.LastError = ""
		if job.Cron != "" {
			job.NextAt, _ = cronNext(job.Cron, now)
		}
		_ = s.store.put("jobs", job.ID, job)
	}
}
