// Makes 1920x1080 wallpapers with the readability scrim baked in, so the TV only ever
// draws one plain JPEG. Live gradients are far too slow on this TV's GPU.
//
//   swift tools/wallpapers.swift img/wallpapers              -> built-in abstract set
//   swift tools/wallpapers.swift img/wallpapers ~/Pictures/tv -> your photos, cropped to fill
//
// Prints the entries to paste into CONFIG.wallpapers in js/config.js.
import AppKit
import CoreGraphics

let W = 1920, H = 1080

// Repeatable random numbers, so the generated wallpapers come out the same every time
struct SeededRandom {
    var state: UInt64
    init(seed: UInt64) { state = seed }
    mutating func next() -> Double {
        state = state &* 6364136223846793005 &+ 1442695040888963407
        return Double(state >> 11) / Double(1 << 53)
    }
}

func rgb(_ hex: UInt32, _ a: CGFloat = 1) -> CGColor {
    CGColor(red: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255,
            blue: CGFloat(hex & 255) / 255, alpha: a)
}

func makeContext() -> CGContext {
    let c = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0,
                      space: CGColorSpaceCreateDeviceRGB(),
                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    // y grows downward, like the screen
    c.translateBy(x: 0, y: CGFloat(H))
    c.scaleBy(x: 1, y: -1)
    return c
}

func vertical(_ c: CGContext, _ colors: [CGColor], _ stops: [CGFloat]) {
    let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors as CFArray, locations: stops)!
    c.drawLinearGradient(g, start: .zero, end: CGPoint(x: 0, y: H), options: [])
}

func glow(_ c: CGContext, _ x: CGFloat, _ y: CGFloat, _ r: CGFloat, _ hex: UInt32, _ a: CGFloat) {
    let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                       colors: [rgb(hex, a), rgb(hex, a * 0.35), rgb(hex, 0)] as CFArray, locations: [0, 0.45, 1])!
    c.drawRadialGradient(g, startCenter: CGPoint(x: x, y: y), startRadius: 0,
                         endCenter: CGPoint(x: x, y: y), endRadius: r, options: [])
}

// Darkens the top-left (clock) and the bottom (tile rows)
func scrim(_ c: CGContext) {
    glow(c, 260, 160, 1150, 0x000000, 0.62)
    let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                       colors: [rgb(0, 0), rgb(0, 0.55), rgb(0, 0.82)] as CFArray, locations: [0, 0.55, 1])!
    c.drawLinearGradient(g, start: CGPoint(x: 0, y: CGFloat(H) * 0.42), end: CGPoint(x: 0, y: H), options: [])
}

func save(_ c: CGContext, _ path: String) {
    let rep = NSBitmapImageRep(cgImage: c.makeImage()!)
    try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.88])!.write(to: URL(fileURLWithPath: path))
}

func slug(_ s: String) -> String {
    s.lowercased().map { $0.isLetter || $0.isNumber ? String($0) : "-" }.joined()
}

let out = CommandLine.arguments[1]
try? FileManager.default.createDirectory(atPath: out, withIntermediateDirectories: true)
var entries: [(String, String)] = []

if CommandLine.arguments.count > 2 {
    let dir = (CommandLine.arguments[2] as NSString).expandingTildeInPath
    let files = try! FileManager.default.contentsOfDirectory(atPath: dir)
        .filter { ["jpg", "jpeg", "png", "heic", "webp"].contains(($0 as NSString).pathExtension.lowercased()) }.sorted()
    for f in files {
        guard let img = NSImage(contentsOfFile: dir + "/" + f),
              let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
        let c = makeContext()
        // Aspect-fill, centred. Draw un-flipped so the photo is the right way up.
        let scale = max(CGFloat(W) / CGFloat(cg.width), CGFloat(H) / CGFloat(cg.height))
        let w = CGFloat(cg.width) * scale, h = CGFloat(cg.height) * scale
        c.saveGState()
        c.translateBy(x: 0, y: CGFloat(H)); c.scaleBy(x: 1, y: -1)
        c.draw(cg, in: CGRect(x: (CGFloat(W) - w) / 2, y: (CGFloat(H) - h) / 2, width: w, height: h))
        c.restoreGState()
        scrim(c)
        let name = ((f as NSString).deletingPathExtension as String).replacingOccurrences(of: "_", with: " ")
        save(c, "\(out)/\(slug(name)).jpg")
        entries.append((slug(name), name))
    }
} else {
    let designs: [(String, (CGContext) -> Void)] = [
        ("Milky Way", { c in
            var rng = SeededRandom(seed: 7)
            vertical(c, [rgb(0x05070d), rgb(0x0c1018), rgb(0x1a1512)], [0, 0.62, 1])
            // The band: soft haze along a diagonal, brighter toward its middle
            for i in 0..<70 {
                let t = CGFloat(i) / 69
                let x = 700 + t * 1000 + CGFloat(rng.next() * 160 - 80)
                let y = 1000 - t * 1050 + CGFloat(rng.next() * 120 - 60)
                let strength = 0.025 + 0.04 * (1 - abs(t - 0.55) * 1.6) + rng.next() * 0.02
                glow(c, x, y, CGFloat(80 + rng.next() * 170), 0xb7b9d6, max(0.012, strength))
            }
            // Faint warm light on the horizon
            glow(c, 360, 1060, 980, 0x7a5232, 0.28)
            // Stars, denser inside the band
            for _ in 0..<2600 {
                var x = CGFloat(rng.next()) * CGFloat(W), y = CGFloat(rng.next()) * CGFloat(H) * 0.8
                if rng.next() < 0.45 {
                    let t = CGFloat(rng.next())
                    x = 700 + t * 1000 + CGFloat(rng.next() * 260 - 130)
                    y = 1000 - t * 1050 + CGFloat(rng.next() * 200 - 100)
                }
                let r = CGFloat(rng.next() < 0.97 ? 0.5 + rng.next() * 0.9 : 1.4 + rng.next() * 1.2)
                c.setFillColor(rgb(0xffffff, CGFloat(0.25 + rng.next() * 0.7)))
                c.fillEllipse(in: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2))
            }
            // Mountain silhouette and a still lake below it
            c.setFillColor(rgb(0x07070a))
            let ridge: [(CGFloat, CGFloat)] = [(980, 1080), (1060, 900), (1140, 860), (1210, 760), (1290, 690),
                (1360, 640), (1420, 560), (1470, 520), (1530, 470), (1600, 520), (1680, 560), (1760, 610),
                (1840, 640), (1920, 660), (1920, 1080)]
            c.move(to: CGPoint(x: ridge[0].0, y: ridge[0].1))
            for p in ridge.dropFirst() { c.addLine(to: CGPoint(x: p.0, y: p.1)) }
            c.closePath(); c.fillPath()
            c.setFillColor(rgb(0x0a0a0d))
            c.move(to: CGPoint(x: 0, y: 960))
            for p in [(400, 940), (700, 955), (980, 940), (1920, 930), (1920, 1080), (0, 1080)] as [(CGFloat, CGFloat)] {
                c.addLine(to: CGPoint(x: p.0, y: p.1))
            }
            c.closePath(); c.fillPath() }),
        ("Dusk", { c in
            vertical(c, [rgb(0x150c2e), rgb(0x4a2257), rgb(0xc8644f)], [0, 0.55, 1])
            glow(c, 1420, 820, 620, 0xffb26b, 0.75)
            glow(c, 420, 260, 760, 0x3b2a8c, 0.45) }),
        ("Deep Sea", { c in
            vertical(c, [rgb(0x020a18), rgb(0x05304f), rgb(0x0a5f7c)], [0, 0.6, 1])
            glow(c, 1500, 300, 760, 0x1fb5c9, 0.42)
            glow(c, 280, 920, 640, 0x0a2f6b, 0.6) }),
        ("Aurora", { c in
            vertical(c, [rgb(0x02050d), rgb(0x081626), rgb(0x0b1d2b)], [0, 0.6, 1])
            glow(c, 640, 240, 820, 0x2ee59d, 0.34)
            glow(c, 1320, 180, 720, 0x6b5cff, 0.34)
            glow(c, 1720, 520, 520, 0x1fd1c9, 0.25) }),
        ("Ember", { c in
            vertical(c, [rgb(0x0b0604), rgb(0x220c07), rgb(0x3a130a)], [0, 0.6, 1])
            glow(c, 1500, 780, 760, 0xff5a1f, 0.5)
            glow(c, 520, 300, 620, 0xa3201a, 0.32) }),
        ("Graphite", { c in
            vertical(c, [rgb(0x0e0f12), rgb(0x181a1f), rgb(0x1f2228)], [0, 0.6, 1])
            glow(c, 1400, 240, 900, 0x424856, 0.6) })
    ]
    for (name, draw) in designs {
        let c = makeContext()
        draw(c)
        scrim(c)
        save(c, "\(out)/\(slug(name)).jpg")
        entries.append((slug(name), name))
    }
}

for (s, name) in entries {
    print("        { file: 'img/wallpapers/\(s).jpg', name: '\(name)' },")
}
