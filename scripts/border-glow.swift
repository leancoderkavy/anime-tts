#!/usr/bin/env swift
// Native macOS border glow — targets the FOCUSED WINDOW, not full screen
// Usage: swift border-glow.swift [hex_color] [border_width] [duration_seconds]

import Cocoa

let args = CommandLine.arguments
let hexColor = args.count > 1 ? args[1] : "8B5CF6"
let borderWidth = args.count > 2 ? CGFloat(Double(args[2]) ?? 4.0) : 4.0
let duration = args.count > 3 ? Double(args[3]) ?? 2.5 : 2.5

func parseHex(_ hex: String) -> NSColor {
    var h = hex
    if h.hasPrefix("#") { h = String(h.dropFirst()) }
    let scanner = Scanner(string: h)
    var rgb: UInt64 = 0
    scanner.scanHexInt64(&rgb)
    return NSColor(
        red: CGFloat((rgb >> 16) & 0xFF) / 255.0,
        green: CGFloat((rgb >> 8) & 0xFF) / 255.0,
        blue: CGFloat(rgb & 0xFF) / 255.0,
        alpha: 0.9
    )
}

// Find the frontmost window's frame using CGWindowList
func getFocusedWindowFrame() -> CGRect? {
    let frontApp = NSWorkspace.shared.frontmostApplication
    guard let pid = frontApp?.processIdentifier else { return nil }

    let windowList = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []

    // Find the frontmost window belonging to the focused app
    for windowInfo in windowList {
        guard let ownerPID = windowInfo[kCGWindowOwnerPID as String] as? Int32,
              ownerPID == pid,
              let layer = windowInfo[kCGWindowLayer as String] as? Int,
              layer == 0, // normal window layer
              let boundsDict = windowInfo[kCGWindowBounds as String] as? [String: CGFloat] else {
            continue
        }

        let x = boundsDict["X"] ?? 0
        let y = boundsDict["Y"] ?? 0
        let w = boundsDict["Width"] ?? 0
        let h = boundsDict["Height"] ?? 0

        // Skip tiny windows (toolbars, popups)
        if w < 200 || h < 200 { continue }

        return CGRect(x: x, y: y, width: w, height: h)
    }

    return nil
}

// Convert CGWindow coordinates (top-left origin) to NSWindow coordinates (bottom-left origin)
func convertToScreenCoords(_ cgRect: CGRect) -> NSRect {
    guard let screen = NSScreen.main else { return NSRect(origin: .zero, size: cgRect.size) }
    let screenHeight = screen.frame.height
    return NSRect(
        x: cgRect.origin.x,
        y: screenHeight - cgRect.origin.y - cgRect.size.height,
        width: cgRect.size.width,
        height: cgRect.size.height
    )
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

// Get focused window frame, fall back to screen
let cgFrame = getFocusedWindowFrame()
let windowFrame: NSRect

if let cgFrame = cgFrame {
    windowFrame = convertToScreenCoords(cgFrame)
} else {
    // Fallback to main screen
    windowFrame = NSScreen.main?.frame ?? NSRect(x: 0, y: 0, width: 1920, height: 1080)
}

// Create overlay window matching the target window's frame
let window = NSWindow(
    contentRect: windowFrame,
    styleMask: .borderless,
    backing: .buffered,
    defer: false
)

window.level = NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.maximumWindow)) + 1)
window.isOpaque = false
window.backgroundColor = .clear
window.ignoresMouseEvents = true
window.hasShadow = false
window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]

// Border view fills the overlay window
let borderView = NSView(frame: NSRect(origin: .zero, size: windowFrame.size))
borderView.wantsLayer = true
borderView.layer?.borderWidth = borderWidth
borderView.layer?.borderColor = parseHex(hexColor).cgColor
borderView.layer?.cornerRadius = 10 // rounded corners to match macOS windows

window.contentView?.addSubview(borderView)
window.alphaValue = 0.0
window.orderFrontRegardless()

// Fade in
NSAnimationContext.runAnimationGroup({ context in
    context.duration = 0.3
    window.animator().alphaValue = 1.0
})

// Hold, then fade out
DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
    NSAnimationContext.runAnimationGroup({ context in
        context.duration = 0.5
        window.animator().alphaValue = 0.0
    }) {
        app.terminate(nil)
    }
}

app.run()
