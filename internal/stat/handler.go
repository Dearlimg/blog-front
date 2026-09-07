package stat

import (
	"strconv"

	"blog-front/pkg/response"

	"github.com/gin-gonic/gin"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) Stats(c *gin.Context) {
	response.Success(c, h.svc.Stats())
}

// Details returns paginated raw visit records (IP, path, UA), optionally filtered by date.
func (h *Handler) Details(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	response.Success(c, h.svc.Details(c.Query("date"), page, pageSize))
}
