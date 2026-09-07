package agent

import "github.com/gin-gonic/gin"

func RegisterFromEnv(r *gin.Engine) error {
	cfg, err := ConfigFromEnv()
	if err != nil {
		return err
	}
	model, err := NewDeepSeek(cfg)
	if err != nil {
		return err
	}
	svc, err := NewService(cfg, model)
	if err != nil {
		return err
	}
	svc.Register(r)
	return nil
}
