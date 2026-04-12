#!/usr/bin/env swift
// Native macOS screen flash overlay
// Usage: swift flash.swift [hex_color] [duration_seconds]

import Cocoa

let args = CommandLine.arguments
let hexColor = args.count > 1 ? args[1] : "8B5CF6"
let duration = args.count > 2 ? Double(args[2]) ?? 0.4 : 0.4

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
        alpha: 0.15
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
window.backgroundColor = parseHex(hexColor)
window.ignoresMouseEvents = true
window.hasShadow = false
window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
window.alphaValue = 0.0
window.orderFrontRegardless()

// Fade in
NSAnimationContext.runAnimationGroup({ context in
    context.duration = duration / 3
    window.animator().alphaValue = 1.0
})

// Fade out
DispatchQueue.main.asyncAfter(deadline: .now() + duration / 3) {
    NSAnimationContext.runAnimationGroup({ context in
        context.duration = duration * 2 / 3
        window.animator().alphaValue = 0.0
    }) {
        app.terminate(nil)
    }
}

app.run()
