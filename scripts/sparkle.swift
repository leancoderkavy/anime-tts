#!/usr/bin/env swift
// Anime sparkle burst — scatters ✧ ✦ ★ ✨ glyphs around the screen.
// Each sparkle drifts upward, twinkles, and fades.
// Usage: swift sparkle.swift [hex_color] [count] [duration_seconds]

import Cocoa
import QuartzCore

let args = CommandLine.arguments
let hexColor = args.count > 1 ? args[1] : "F472B6"
let count = args.count > 2 ? (Int(args[2]) ?? 14) : 14
let duration = args.count > 3 ? Double(args[3]) ?? 1.6 : 1.6

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

let contentView = NSView(frame: screen.frame)
contentView.wantsLayer = true
window.contentView = contentView

let glyphs = ["✦", "✧", "★", "✨", "✩", "❀"]
let color = parseHex(hexColor)

for i in 0..<count {
    let glyph = glyphs.randomElement() ?? "✦"
    let size = CGFloat.random(in: 24...56)

    let label = NSTextField(labelWithString: glyph)
    label.font = NSFont.systemFont(ofSize: size, weight: .bold)
    label.textColor = color
    label.drawsBackground = false
    label.isBordered = false
    label.sizeToFit()

    // Random spawn — biased toward edges/corners for "burst from outside" feel
    let edgeBias = Bool.random()
    let x: CGFloat
    let y: CGFloat
    if edgeBias {
        x = CGFloat.random(in: 0...screen.frame.width)
        y = Bool.random() ? CGFloat.random(in: 0...(screen.frame.height * 0.25))
                          : CGFloat.random(in: (screen.frame.height * 0.75)...screen.frame.height)
    } else {
        x = CGFloat.random(in: 0...screen.frame.width)
        y = CGFloat.random(in: 0...screen.frame.height)
    }

    label.frame = NSRect(x: x, y: y, width: label.frame.width, height: label.frame.height)
    label.wantsLayer = true
    label.layer?.opacity = 0.0
    label.layer?.shadowColor = color.cgColor
    label.layer?.shadowRadius = 8
    label.layer?.shadowOpacity = 0.95
    label.layer?.shadowOffset = .zero
    contentView.addSubview(label)

    let delay = Double(i) * 0.04 + Double.random(in: 0...0.15)

    // Fade in
    let fadeIn = CABasicAnimation(keyPath: "opacity")
    fadeIn.fromValue = 0.0
    fadeIn.toValue = 1.0
    fadeIn.duration = 0.18
    fadeIn.beginTime = CACurrentMediaTime() + delay
    fadeIn.fillMode = .forwards
    fadeIn.isRemovedOnCompletion = false
    label.layer?.add(fadeIn, forKey: "fadeIn")

    // Twinkle: scale pulse
    let twinkle = CABasicAnimation(keyPath: "transform.scale")
    twinkle.fromValue = 0.4
    twinkle.toValue = 1.2
    twinkle.duration = 0.35
    twinkle.beginTime = CACurrentMediaTime() + delay
    twinkle.timingFunction = CAMediaTimingFunction(name: .easeOut)
    twinkle.fillMode = .forwards
    twinkle.isRemovedOnCompletion = false
    label.layer?.add(twinkle, forKey: "twinkle")

    // Drift upward
    let drift = CABasicAnimation(keyPath: "position.y")
    drift.fromValue = label.layer?.position.y ?? y
    drift.toValue = (label.layer?.position.y ?? y) + CGFloat.random(in: 30...80)
    drift.duration = duration
    drift.beginTime = CACurrentMediaTime() + delay
    drift.fillMode = .forwards
    drift.isRemovedOnCompletion = false
    label.layer?.add(drift, forKey: "drift")

    // Fade out at the end
    let fadeOut = CABasicAnimation(keyPath: "opacity")
    fadeOut.fromValue = 1.0
    fadeOut.toValue = 0.0
    fadeOut.duration = 0.45
    fadeOut.beginTime = CACurrentMediaTime() + delay + duration - 0.45
    fadeOut.fillMode = .forwards
    fadeOut.isRemovedOnCompletion = false
    label.layer?.add(fadeOut, forKey: "fadeOut")
}

window.alphaValue = 1.0
window.orderFrontRegardless()

DispatchQueue.main.asyncAfter(deadline: .now() + duration + 0.5) {
    app.terminate(nil)
}

app.run()
