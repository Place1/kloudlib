package main

import (
	"fmt"
	"net/http"

	"log"
)

func main() {
	log.Print("leeroy web server ready")
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello, you've requested: %s\n", r.URL.Path)
	})
	http.ListenAndServe(":8000", nil)
}
