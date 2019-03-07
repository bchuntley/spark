package logger

import (
	"os"

	"github.com/apsdehal/go-logger"
)

var log *logger.Logger

func init() {
	var err error
	log, err = logger.New("SparkLogger", 1, os.Stdout)
	if err != nil {
		panic(err)
	}
}

//Info logging
func Info(msg string) {
	log.Info(msg)
}

//Debug logging
func Debug(msg string) {
	log.Debug(msg)
}

//Warn logging
func Warn(msg string) {
	log.Warning(msg)
}

//Crit logging
func Crit(msg string) {
	log.Critical(msg)
}

//Fatal logging
func Fatal(msg string) {
	log.Fatal(msg)
}
