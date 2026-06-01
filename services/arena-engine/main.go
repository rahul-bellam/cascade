package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

type HealthResponse struct {
	Service string `json:"service"`
	Status  string `json:"status"`
	Version string `json:"version"`
	Uptime  string `json:"uptime"`
}

var startTime = time.Now()

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(HealthResponse{
		Service: "cascade-arena-engine",
		Status:  "operational",
		Version: "0.1.0",
		Uptime:  time.Since(startTime).Round(time.Second).String(),
	})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8096"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)

	addr := fmt.Sprintf(":%s", port)
	log.Printf("Arena engine starting on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
