package config

import (
	"net"
	"net/url"
)

//State of the server
type State int

//enum for server states
const (
	Follower State = iota
	Candidate
	Leader
)

func (s State) String() string {
	return [...]string{"Follower", "Candidate", "Leader"}[s]
}

type connectionStick struct {
	source net.IP
	target Server
}

type health struct {
	min int
	max int
}

// Server type for a running spark server
type Server struct {
	name        string
	tags        []string
	state       State
	siblings    []*Server
	leader      *Server
	connections []connectionStick
	health      health
	healthRoute string
}

// Job type for running a spark job
type Job struct {
	name        string
	dockerImage url.URL
	tags string[]
	desiredHosts int
	env map
}
