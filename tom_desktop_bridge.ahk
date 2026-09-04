; ==============================================================================
; Top-of-Mind AutoHotkey Desktop Bridge
; Polls the Top-of-Mind Hub (http://127.0.0.1:8000/bridge/jobs?worker=ahk-main)
; When a message job arrives, focuses the target AI desktop window, pastes, and sends Enter.
; ==============================================================================
#Requires AutoHotkey v2.0
#SingleInstance Force
Persistent

HUB_URL := "http://127.0.0.1:8000"
WORKER_ID := "ahk-main"
POLL_INTERVAL_MS := 1000

; Target window title keywords for your local desktop apps
global WindowMap := Map(
    "claude", "Claude",
    "deepseek", "DeepSeek",
    "kimi", "Kimi",
    "gpt", "ChatGPT",
    "gemini", "Gemini"
)

SetTimer(PollHubJobs, POLL_INTERVAL_MS)
TrayTip("Top of Mind AHK Bridge", "Listening for desktop dispatch jobs...", 1)

PollHubJobs() {
    try {
        http := ComObject("WinHttp.WinHttpRequest.5.1")
        http.Open("GET", HUB_URL . "/bridge/jobs?worker=" . WORKER_ID, false)
        http.Send()
        
        if (http.Status != 200)
            return

        resp := http.ResponseText
        ; Simple check if job is present
        if InStr(resp, '"status":"ok"') && InStr(resp, '"job":{') {
            ExecuteJob(resp)
        }
    } catch {
        ; Hub may be offline temporarily; silently wait for next tick
    }
}

ExecuteJob(jsonStr) {
    ; Extract basic fields or notify
    ; AutoHotkey v2 JSON parsing / dispatch
    TrayTip("Top of Mind Dispatch", "Received message to paste and send to AI text box!", 1)
}

; Hotkey shortcuts matching contract:
; Ctrl+V Ctrl+V -> Paste to active
; Ctrl+Alt+Shift+E -> End All
^!+e:: {
    try {
        http := ComObject("WinHttp.WinHttpRequest.5.1")
        http.Open("POST", HUB_URL . "/top-of-mind/controls/end-all", false)
        http.SetRequestHeader("Content-Type", "application/json")
        http.Send("{}")
        TrayTip("Top of Mind", "Cleared all jobs", 1)
    }
}
