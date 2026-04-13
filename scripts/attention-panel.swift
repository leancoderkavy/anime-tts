#!/usr/bin/env swift
// Floating "sessions awaiting your attention" panel.
// Reads ~/.claude/anime-tts-attention.json every 1s and renders a list of
// Claude Code sessions that have finished a turn and need user input.
//
// Click a row to dismiss. Drag the title bar to reposition.
// Long-running daemon — kill via PID file or Activity Monitor.

import Cocoa

// ── State path ─────────────────────────────────────────────────────────────

let statePath = NSString(string: "~/.claude/anime-tts-attention.json").expandingTildeInPath
let pidPath = NSString(string: "~/.claude/anime-tts-panel.pid").expandingTildeInPath

// Write our PID so /sessions hide can find us
do {
    try String(ProcessInfo.processInfo.processIdentifier).write(toFile: pidPath, atomically: true, encoding: .utf8)
} catch {}

// ── Data model ─────────────────────────────────────────────────────────────

struct AwaitingSession {
    let sessionId: String
    let project: String
    let cwd: String
    let summary: String
    let finishedAt: TimeInterval
}

func readSessions() -> [AwaitingSession] {
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: statePath)),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let sessionsDict = json["sessions"] as? [String: Any] else {
        return []
    }
    var out: [AwaitingSession] = []
    for (id, raw) in sessionsDict {
        guard let dict = raw as? [String: Any] else { continue }
        let project = dict["project"] as? String ?? "unknown"
        let cwd = dict["cwd"] as? String ?? ""
        let summary = dict["summary"] as? String ?? ""
        let finishedAt = (dict["finishedAt"] as? Double ?? 0) / 1000.0
        out.append(AwaitingSession(sessionId: id, project: project, cwd: cwd, summary: summary, finishedAt: finishedAt))
    }
    return out.sorted { $0.finishedAt > $1.finishedAt }
}

func clearSession(_ sessionId: String) {
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: statePath)),
          var json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          var sessionsDict = json["sessions"] as? [String: Any] else { return }
    sessionsDict.removeValue(forKey: sessionId)
    json["sessions"] = sessionsDict
    if let out = try? JSONSerialization.data(withJSONObject: json, options: [.prettyPrinted]) {
        try? out.write(to: URL(fileURLWithPath: statePath))
    }
}

func relativeAge(_ ts: TimeInterval) -> String {
    let delta = Int(Date().timeIntervalSince1970 - ts)
    if delta < 60 { return "\(delta)s" }
    if delta < 3600 { return "\(delta / 60)m" }
    if delta < 86400 { return "\(delta / 3600)h" }
    return "\(delta / 86400)d"
}

// ── Flipped clip view (so stack content flows from the top) ────────────────

class FlippedClipView: NSClipView {
    override var isFlipped: Bool { true }
}

// ── Marquee label — horizontally scrolls long text continuously ────────────

class MarqueeLabel: NSView {
    private let textLayer1 = CATextLayer()
    private let textLayer2 = CATextLayer()
    private let containerLayer = CALayer()
    private var fullTextWidth: CGFloat = 0
    private let gap: CGFloat = 40

    var text: String = "" { didSet { updateText() } }
    var textColor: NSColor = .white { didSet { applyColor() } }
    var fontSize: CGFloat = 10.5 { didSet { updateText() } }

    override init(frame: NSRect) {
        super.init(frame: frame)
        wantsLayer = true
        layer?.masksToBounds = true
        layer?.addSublayer(containerLayer)

        for tl in [textLayer1, textLayer2] {
            tl.contentsScale = NSScreen.main?.backingScaleFactor ?? 2.0
            tl.alignmentMode = .left
            tl.truncationMode = .none
            tl.isWrapped = false
            containerLayer.addSublayer(tl)
        }
    }
    required init?(coder: NSCoder) { fatalError() }

    override func layout() {
        super.layout()
        containerLayer.frame = bounds
        updateText()
    }

    private func applyColor() {
        let cg = textColor.cgColor
        textLayer1.foregroundColor = cg
        textLayer2.foregroundColor = cg
    }

    private func updateText() {
        let font = NSFont.systemFont(ofSize: fontSize)
        let attrs: [NSAttributedString.Key: Any] = [.font: font]
        let measured = (text as NSString).size(withAttributes: attrs)
        fullTextWidth = ceil(measured.width)
        let h = ceil(measured.height)
        let y = (bounds.height - h) / 2

        textLayer1.font = font
        textLayer1.fontSize = fontSize
        textLayer1.string = text
        textLayer1.frame = CGRect(x: 0, y: y, width: fullTextWidth, height: h)

        textLayer2.font = font
        textLayer2.fontSize = fontSize
        textLayer2.string = text

        applyColor()

        let needsScroll = fullTextWidth > bounds.width
        if needsScroll {
            textLayer2.isHidden = false
            textLayer2.frame = CGRect(x: fullTextWidth + gap, y: y, width: fullTextWidth, height: h)
            startScrolling()
        } else {
            textLayer2.isHidden = true
            containerLayer.removeAllAnimations()
            containerLayer.position = CGPoint(x: bounds.width / 2, y: bounds.height / 2)
            containerLayer.bounds = bounds
        }
    }

    private func startScrolling() {
        containerLayer.removeAllAnimations()
        // Anchor at left so position.x maps directly to leading edge
        containerLayer.anchorPoint = CGPoint(x: 0, y: 0)
        containerLayer.frame = bounds

        let distance = fullTextWidth + gap
        let pixelsPerSecond: CGFloat = 30
        let duration = Double(distance / pixelsPerSecond)

        let anim = CABasicAnimation(keyPath: "position.x")
        anim.fromValue = 0
        anim.toValue = -distance
        anim.duration = duration
        anim.repeatCount = .infinity
        anim.timingFunction = CAMediaTimingFunction(name: .linear)
        containerLayer.add(anim, forKey: "marquee")
    }
}

// ── Custom row view ────────────────────────────────────────────────────────

class SessionRowView: NSView {
    let session: AwaitingSession
    let onDismiss: (String) -> Void
    var hovering = false

    init(session: AwaitingSession, width: CGFloat, onDismiss: @escaping (String) -> Void) {
        self.session = session
        self.onDismiss = onDismiss
        super.init(frame: NSRect(x: 0, y: 0, width: width, height: 56))
        self.wantsLayer = true
        self.layer?.cornerRadius = 8
        self.layer?.backgroundColor = NSColor(red: 0.15, green: 0.10, blue: 0.20, alpha: 0.75).cgColor

        // Pink dot indicator
        let dot = NSView(frame: NSRect(x: 12, y: 22, width: 12, height: 12))
        dot.wantsLayer = true
        dot.layer?.cornerRadius = 6
        dot.layer?.backgroundColor = NSColor(red: 0.96, green: 0.45, blue: 0.71, alpha: 1.0).cgColor
        dot.layer?.shadowColor = NSColor(red: 0.96, green: 0.45, blue: 0.71, alpha: 1.0).cgColor
        dot.layer?.shadowOpacity = 0.9
        dot.layer?.shadowRadius = 6
        dot.layer?.shadowOffset = .zero
        addSubview(dot)

        // Pulse animation on dot
        let pulse = CABasicAnimation(keyPath: "opacity")
        pulse.fromValue = 0.4
        pulse.toValue = 1.0
        pulse.duration = 0.9
        pulse.autoreverses = true
        pulse.repeatCount = .infinity
        dot.layer?.add(pulse, forKey: "pulse")

        // Project name
        let title = NSTextField(labelWithString: session.project)
        title.font = NSFont.systemFont(ofSize: 13, weight: .bold)
        title.textColor = NSColor(red: 1.0, green: 0.85, blue: 0.95, alpha: 1.0)
        title.frame = NSRect(x: 32, y: 30, width: width - 80, height: 18)
        title.drawsBackground = false
        title.isBordered = false
        addSubview(title)

        // Age (right side)
        let ageLabel = NSTextField(labelWithString: relativeAge(session.finishedAt))
        ageLabel.font = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)
        ageLabel.textColor = NSColor(red: 0.7, green: 0.6, blue: 0.85, alpha: 1.0)
        ageLabel.alignment = .right
        ageLabel.frame = NSRect(x: width - 50, y: 32, width: 38, height: 14)
        ageLabel.drawsBackground = false
        ageLabel.isBordered = false
        addSubview(ageLabel)

        // Summary — horizontally scrolling marquee for long messages
        let snippet = session.summary.isEmpty ? "(awaiting)" : session.summary
        let summary = MarqueeLabel(frame: NSRect(x: 32, y: 6, width: width - 44, height: 18))
        summary.textColor = NSColor(white: 0.88, alpha: 0.92)
        summary.fontSize = 10.5
        summary.text = snippet
        addSubview(summary)

        let trackingArea = NSTrackingArea(rect: bounds, options: [.activeAlways, .mouseEnteredAndExited, .inVisibleRect], owner: self, userInfo: nil)
        addTrackingArea(trackingArea)
    }

    required init?(coder: NSCoder) { fatalError() }

    override func mouseEntered(with event: NSEvent) {
        layer?.backgroundColor = NSColor(red: 0.22, green: 0.14, blue: 0.30, alpha: 0.92).cgColor
    }
    override func mouseExited(with event: NSEvent) {
        layer?.backgroundColor = NSColor(red: 0.15, green: 0.10, blue: 0.20, alpha: 0.75).cgColor
    }
    override func mouseDown(with event: NSEvent) {
        onDismiss(session.sessionId)
    }
}

// ── Panel controller ───────────────────────────────────────────────────────

class PanelController: NSObject {
    var panel: NSPanel!
    var contentStack: NSStackView!
    var headerLabel: NSTextField!
    var emptyLabel: NSTextField!
    var lastSessionIds: Set<String> = []
    let panelWidth: CGFloat = 340

    func build() {
        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1920, height: 1080)
        let panelHeight: CGFloat = 420
        let frame = NSRect(
            x: screen.maxX - panelWidth - 24,
            y: screen.maxY - panelHeight - 24,
            width: panelWidth,
            height: panelHeight
        )

        panel = NSPanel(
            contentRect: frame,
            styleMask: [.titled, .nonactivatingPanel, .utilityWindow, .closable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        panel.title = "✦ Awaiting You"
        panel.titlebarAppearsTransparent = true
        panel.titleVisibility = .visible
        panel.isFloatingPanel = true
        panel.level = .floating
        panel.hidesOnDeactivate = false
        panel.becomesKeyOnlyIfNeeded = true
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.isMovableByWindowBackground = true
        panel.backgroundColor = NSColor(red: 0.08, green: 0.05, blue: 0.13, alpha: 0.92)
        panel.hasShadow = true

        let content = NSView(frame: NSRect(origin: .zero, size: frame.size))
        content.wantsLayer = true
        content.layer?.cornerRadius = 14
        content.layer?.backgroundColor = NSColor(red: 0.08, green: 0.05, blue: 0.13, alpha: 0.92).cgColor
        content.layer?.borderColor = NSColor(red: 0.55, green: 0.40, blue: 0.85, alpha: 0.7).cgColor
        content.layer?.borderWidth = 1.5

        headerLabel = NSTextField(labelWithString: "0 sessions awaiting")
        headerLabel.font = NSFont.systemFont(ofSize: 11, weight: .medium)
        headerLabel.textColor = NSColor(red: 0.78, green: 0.65, blue: 0.95, alpha: 1.0)
        headerLabel.alignment = .right
        headerLabel.frame = NSRect(x: 12, y: frame.height - 50, width: frame.width - 24, height: 16)
        headerLabel.drawsBackground = false
        headerLabel.isBordered = false
        content.addSubview(headerLabel)

        // Flipped clip view so y=0 is at the top — content starts from the top edge
        let scroll = NSScrollView(frame: NSRect(x: 8, y: 12, width: frame.width - 16, height: frame.height - 70))
        scroll.hasVerticalScroller = true
        scroll.drawsBackground = false
        scroll.borderType = .noBorder
        scroll.autohidesScrollers = true

        let clip = FlippedClipView()
        clip.drawsBackground = false
        scroll.contentView = clip

        contentStack = NSStackView()
        contentStack.orientation = .vertical
        contentStack.spacing = 6
        contentStack.alignment = .leading
        contentStack.distribution = .fill
        contentStack.edgeInsets = NSEdgeInsets(top: 4, left: 4, bottom: 4, right: 4)
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        contentStack.setHuggingPriority(.required, for: .vertical)

        scroll.documentView = contentStack
        NSLayoutConstraint.activate([
            contentStack.leadingAnchor.constraint(equalTo: clip.leadingAnchor),
            contentStack.trailingAnchor.constraint(equalTo: clip.trailingAnchor),
            contentStack.topAnchor.constraint(equalTo: clip.topAnchor),
            contentStack.widthAnchor.constraint(equalTo: clip.widthAnchor),
        ])
        content.addSubview(scroll)

        emptyLabel = NSTextField(labelWithString: "✧ all caught up ✧")
        emptyLabel.font = NSFont.systemFont(ofSize: 13, weight: .light)
        emptyLabel.textColor = NSColor(red: 0.6, green: 0.5, blue: 0.8, alpha: 0.8)
        emptyLabel.alignment = .center
        emptyLabel.frame = NSRect(x: 0, y: frame.height / 2 - 20, width: frame.width, height: 20)
        emptyLabel.drawsBackground = false
        emptyLabel.isBordered = false
        content.addSubview(emptyLabel)

        panel.contentView = content
        panel.orderFrontRegardless()

        Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.refresh()
        }
        refresh()
    }

    func refresh() {
        let sessions = readSessions()
        let ids = Set(sessions.map { $0.sessionId })

        // Detect new arrivals → bounce / pulse panel
        let newOnes = ids.subtracting(lastSessionIds)
        if !newOnes.isEmpty && !lastSessionIds.isEmpty {
            bounce()
        }
        lastSessionIds = ids

        // Rebuild list
        contentStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for s in sessions {
            let row = SessionRowView(session: s, width: panelWidth - 32) { [weak self] sid in
                clearSession(sid)
                self?.refresh()
            }
            row.translatesAutoresizingMaskIntoConstraints = false
            contentStack.addArrangedSubview(row)
            row.widthAnchor.constraint(equalToConstant: panelWidth - 32).isActive = true
            row.heightAnchor.constraint(equalToConstant: 56).isActive = true
        }

        headerLabel.stringValue = sessions.isEmpty
            ? "all caught up"
            : "\(sessions.count) session\(sessions.count == 1 ? "" : "s") awaiting"
        emptyLabel.isHidden = !sessions.isEmpty
    }

    func bounce() {
        guard let layer = panel.contentView?.layer else { return }
        let pulse = CABasicAnimation(keyPath: "borderColor")
        pulse.fromValue = NSColor(red: 0.96, green: 0.45, blue: 0.71, alpha: 1.0).cgColor
        pulse.toValue = NSColor(red: 0.55, green: 0.40, blue: 0.85, alpha: 0.7).cgColor
        pulse.duration = 0.6
        pulse.autoreverses = true
        pulse.repeatCount = 2
        layer.add(pulse, forKey: "newSession")
    }
}

// ── Boot ───────────────────────────────────────────────────────────────────

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let controller = PanelController()
controller.build()

// Cleanup PID file on exit
signal(SIGTERM) { _ in
    try? FileManager.default.removeItem(atPath: pidPath)
    exit(0)
}
signal(SIGINT) { _ in
    try? FileManager.default.removeItem(atPath: pidPath)
    exit(0)
}

app.run()
