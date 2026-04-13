#!/usr/bin/env swift
// Anime aura border: pulsing glow on the focused window with outer chromatic shadow.
// Throbs 3 times like a charging energy aura before fading out.
// Usage: swift border-glow.swift [hex_color] [border_width] [duration_seconds]

import Cocoa
import QuartzCore

let args = CommandLine.arguments
let hexColor = args.count > 1 ? args[1] : "8B5CF6"
let borderWidth = args.count > 2 ? CGFloat(Double(args[2]) ?? 4.0) : 4.0
let duration = args.count > 3 ? Double(args[3]) ?? 2.5 : 2.5

func parseHex(_ hex: String, alpha: CGFloat = 1.0) -> NSColor {
    var h = hex
    if h.hasPrefix("#") { h = String(h.dropFirst()) }
    let scanner = Scanner(string: h)
    var rgb: UInt64 = 0
    scanner.scanHexInt64(&rgb)
    return NSColor(
        red: CGFloat((rgb >> 16) & 0xFF) / 255.0,
        green: CGFloat((rgb >> 8) & 0xFF) / 255.0,
        blue: CGFloat(rgb & 0xFF) / 255.0,
        alpha: alpha
    )
}

func getFocusedWindowFrame() -> CGRect? {
    let frontApp = NSWorkspace.shared.frontmostApplication
    guard let pid = frontApp?.processIdentifier else { return nil }
    let windowList = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
    for windowInfo in windowList {
        guard let ownerPID = windowInfo[kCGWindowOwnerPID as String] as? Int32,
              ownerPID == pid,
              let layer = windowInfo[kCGWindowLayer as String] as? Int,
              layer == 0,
              let boundsDict = windowInfo[kCGWindowBounds as String] as? [String: CGFloat] else {
            continue
        }
        let x = boundsDict["X"] ?? 0
        let y = boundsDict["Y"] ?? 0
        let w = boundsDict["Width"] ?? 0
        let h = boundsDict["Height"] ?? 0
        if w < 200 || h < 200 { continue }
        return CGRect(x: x, y: y, width: w, height: h)
    }
    return nil
}

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

let cgFrame = getFocusedWindowFrame()
let baseFrame: NSRect
if let cgFrame = cgFrame {
    baseFrame = convertToScreenCoords(cgFrame)
} else {
    baseFrame = NSScreen.main?.frame ?? NSRect(x: 0, y: 0, width: 1920, height: 1080)
}

// Pad outward so outer glow has room to bleed
let pad: CGFloat = 40
let windowFrame = baseFrame.insetBy(dx: -pad, dy: -pad)

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

let contentView = NSView(frame: NSRect(origin: .zero, size: windowFrame.size))
contentView.wantsLayer = true
window.contentView = contentView

// Inner crisp border layer
let innerRect = NSRect(x: pad, y: pad, width: baseFrame.size.width, height: baseFrame.size.height)
let innerLayer = CALayer()
innerLayer.frame = innerRect
innerLayer.borderColor = parseHex(hexColor, alpha: 0.95).cgColor
innerLayer.borderWidth = borderWidth
innerLayer.cornerRadius = 12
contentView.layer?.addSublayer(innerLayer)

// Outer aura layer — wider, softer, glowing
let auraLayer = CALayer()
auraLayer.frame = innerRect
auraLayer.borderColor = parseHex(hexColor, alpha: 0.55).cgColor
auraLayer.borderWidth = borderWidth * 2.5
auraLayer.cornerRadius = 16
auraLayer.shadowColor = parseHex(hexColor).cgColor
auraLayer.shadowOffset = .zero
auraLayer.shadowRadius = 28
auraLayer.shadowOpacity = 0.9
contentView.layer?.addSublayer(auraLayer)

window.alphaValue = 0.0
window.orderFrontRegardless()

// Throbbing pulse animation — brightness oscillates 3 times
let pulseCount = 3
let pulseDuration = duration / Double(pulseCount)

let pulse = CABasicAnimation(keyPath: "opacity")
pulse.fromValue = 0.45
pulse.toValue = 1.0
pulse.duration = pulseDuration / 2
pulse.autoreverses = true
pulse.repeatCount = Float(pulseCount)
pulse.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
auraLayer.add(pulse, forKey: "throb")

// Inner border slow scale-pulse for breathing feel
let scale = CABasicAnimation(keyPath: "transform.scale")
scale.fromValue = 1.0
scale.toValue = 1.015
scale.duration = pulseDuration / 2
scale.autoreverses = true
scale.repeatCount = Float(pulseCount)
scale.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
innerLayer.add(scale, forKey: "breathe")

NSAnimationContext.runAnimationGroup({ ctx in
    ctx.duration = 0.25
    window.animator().alphaValue = 1.0
})

DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
    NSAnimationContext.runAnimationGroup({ ctx in
        ctx.duration = 0.5
        window.animator().alphaValue = 0.0
    }) {
        app.terminate(nil)
    }
}

app.run()
