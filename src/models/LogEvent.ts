enum LogEvent {
    Update,
    Elect,
    ReceiveUpdate,
    RunJob,
    ReceiveJob,
    JobStarted,
    JobKilled,
    ImagePulled
}

export default LogEvent;
