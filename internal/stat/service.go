package stat

import (
	"log/slog"
	"time"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Record(ip, path, ua string) {
	date := today()
	go func() {
		s.repo.IncrPV(date)
		s.repo.PfaddUV(date, ip)
		if err := s.repo.InsertVisitDetail(&VisitDetail{
			Date:      date,
			IP:        ip,
			Path:      truncate(path, 255),
			UserAgent: truncate(ua, 512),
		}); err != nil {
			slog.Warn("record visit detail failed", "error", err)
		}
	}()
}

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}

// DetailRetention controls how long raw visit rows are kept.
const detailRetention = 30 * 24 * time.Hour

func (s *Service) Details(date string, page, pageSize int) *DetailsResp {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	items, total := s.repo.ListVisitDetails(date, page, pageSize)
	return &DetailsResp{Total: total, Items: items}
}

func (s *Service) Cleanup() {
	if err := s.repo.CleanupVisitDetails(time.Now().Add(-detailRetention)); err != nil {
		slog.Warn("cleanup visit details failed", "error", err)
	}
}

func (s *Service) Stats() *StatsResp {
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")

	resp := &StatsResp{}
	resp.Today = s.dayStats(today())
	resp.Yesterday = s.dayStats(yesterday)
	resp.Total.PV, resp.Total.UV = s.repo.SumAllMySQL()
	resp.History = s.repo.ListAllMySQL(30)

	return resp
}

func (s *Service) dayStats(date string) DayStats {
	pv, errPV := s.repo.RedisPV(date)
	uv, errUV := s.repo.RedisUV(date)

	if errPV == nil && errUV == nil {
		return DayStats{PV: pv, UV: uv}
	}

	log, err := s.repo.QueryMySQL(date)
	if err != nil {
		return DayStats{}
	}

	return DayStats{PV: log.PV, UV: log.UV}
}

func (s *Service) Sync() {
	date := today()

	pv, errPV := s.repo.RedisPV(date)
	uv, errUV := s.repo.RedisUV(date)

	if errPV != nil || errUV != nil {
		slog.Warn("stats sync skipped, redis unavailable")
		return
	}

	if pv == 0 && uv == 0 {
		return
	}

	s.repo.UpsertMySQL(date, pv, uv)
	slog.Info("stats synced", "date", date, "pv", pv, "uv", uv)
}

func StartSyncLoop(svc *Service) {
	svc.Sync()
	svc.Cleanup()

	lastClean := time.Now().Format("2006-01-02")
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		svc.Sync()
		if d := time.Now().Format("2006-01-02"); d != lastClean {
			lastClean = d
			svc.Cleanup()
		}
	}
}
