#!/usr/bin/env swift
// Anime-style screen burst: fast triple-pulse strobe with chromatic punch.
// Usage: swift flash.swift [hex_color] [duration_seconds]

import Cocoa

let args = CommandLine.arguments
let hexColor = args.count > 1 ? args[1] : "8B5CF6"
let duration = args.count > 2 ? Double(args[2]) ?? 0.4 : 0.4

func parseHex(_ hex: String, alpha: CGFloat) -> NSColor {
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

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

guard let screen = NSScreen.main else { exit(1) }

let window = NSWindow(
    contentRect: screen.frame,
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

// Radial-gradient layer: bright center, transparent edges (anime impact frame)
let containerView = NSView(frame: screen.frame)
containerView.wantsLayer = true
let gradient = CAGradientLayer()
gradient.frame = screen.frame
gradient.type = .radial
gradient.startPoint = CGPoint(x: 0.5, y: 0.5)
gradient.endPoint = CGPoint(x: 1.0, y: 1.0)
gradient.colors = [
    parseHex("FFFFFF", alpha: 0.35).cgColor,
    parseHex(hexColor, alpha: 0.22).cgColor,
    parseHex(hexColor, alpha: 0.0).cgColor,
]
gradient.locations = [0.0, 0.45, 1.0]
containerView.layer = gradient
window.contentView = containerView

window.alphaValue = 0.0
window.orderFrontRegardless()

// Triple-pulse anime burst: punch in/out three times fast
let pulseCount = 3
let pulseInterval = duration / Double(pulseCount * 2)

func pulse(_ index: Int) {
    if index >= pulseCount {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { app.terminate(nil) }
        return
    }
    NSAnimationContext.runAnimationGroup({ ctx in
        ctx.duration = pulseInterval
        ctx.timingFunction = CAMediaTimingFunction(name: .easeOut)
        window.animator().alphaValue = 1.0
    }) {
        NSAnimationContext.runAnimationGroup({ ctx in
            ctx.duration = pulseInterval
            ctx.timingFunction = CAMediaTimingFunction(name: .easeIn)
            window.animator().alphaValue = index == pulseCount - 1 ? 0.0 : 0.25
        }) {
            pulse(index + 1)
        }
    }
}

pulse(0)
app.run()
