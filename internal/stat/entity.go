package stat

import "time"

type VisitLog struct {
	ID   uint   `json:"id" gorm:"primaryKey"`
	Date string `json:"date" gorm:"uniqueIndex;size:10;not null"`
	PV   int64  `json:"pv" gorm:"default:0"`
	UV   int64  `json:"uv" gorm:"default:0"`
}

func (VisitLog) TableName() string { return "visit_logs" }

// VisitDetail records one raw page visit (IP, path, UA) for analysis.
type VisitDetail struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Date      string    `json:"date" gorm:"size:10;index;not null"`
	IP        string    `json:"ip" gorm:"size:45;index;not null"`
	Path      string    `json:"path" gorm:"size:255"`
	UserAgent string    `json:"user_agent" gorm:"size:512"`
	CreatedAt time.Time `json:"created_at"`
}

func (VisitDetail) TableName() string { return "visit_details" }

type DayStats struct {
	PV int64 `json:"pv"`
	UV int64 `json:"uv"`
}

type StatsResp struct {
	Today     DayStats   `json:"today"`
	Yesterday DayStats   `json:"yesterday"`
	Total     DayStats   `json:"total"`
	History   []VisitLog `json:"history"`
}

type DetailsResp struct {
	Total int64         `json:"total"`
	Items []VisitDetail `json:"items"`
}
