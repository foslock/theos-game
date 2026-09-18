#!/usr/bin/env python3
"""Tiny PixelLab v2 client for Theo's Game assets.

Reads PIXELLAB_API_KEY from .env (or the environment). No third-party deps
beyond Pillow, which is only needed for the `sheet` command.

  python3 scripts/pixellab.py balance
  python3 scripts/pixellab.py character NAME "description" WxH [--view V] [--seed N]
  python3 scripts/pixellab.py animate CHAR_ID TEMPLATE [--directions east,south]
  python3 scripts/pixellab.py export CHAR_ID OUT_DIR
  python3 scripts/pixellab.py sheet OUT_DIR W H OUT_PNG [--idle NAME] [--walk NAME] [--dir east]
  python3 scripts/pixellab.py job JOB_ID
  python3 scripts/pixellab.py image "description" WxH OUT_PNG [--reference photo.jpg "usage"] [--style style.png] [--seed N] [--background]
"""
import base64, io, json, os, sys, time, urllib.request, urllib.error, zipfile

API = "https://api.pixellab.ai/v2"


def load_key():
    key = os.environ.get("PIXELLAB_API_KEY")
    if not key and os.path.exists(".env"):
        for line in open(".env"):
            line = line.strip()
            if line.startswith("PIXELLAB_API_KEY="):
                key = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not key:
        sys.exit("PIXELLAB_API_KEY not set (put it in .env)")
    return key


def request(method, path, body=None, raw=False):
    req = urllib.request.Request(API + path, method=method)
    req.add_header("Authorization", "Bearer " + load_key())
    data = None
    if body is not None:
        req.add_header("Content-Type", "application/json")
        data = json.dumps(body).encode()
    try:
        with urllib.request.urlopen(req, data, timeout=120) as r:
            payload = r.read()
            return payload if raw else json.loads(payload)
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} {method} {path}: {e.read().decode()[:2000]}")


def b64_image(path):
    with open(path, "rb") as f:
        fmt = "jpeg" if path.lower().endswith((".jpg", ".jpeg")) else "png"
        return {"type": "base64", "base64": base64.b64encode(f.read()).decode(), "format": fmt}


def poll(job_id, every=5):
    while True:
        j = request("GET", f"/background-jobs/{job_id}")
        st = j.get("status")
        print(f"  job {job_id[:8]} {st}", flush=True)
        if st == "completed":
            return j
        if st == "failed":
            sys.exit("job failed: " + json.dumps(j)[:2000])
        time.sleep(every)


def opt(args, name, default=None):
    if name in args:
        i = args.index(name)
        v = args[i + 1]
        del args[i:i + 2]
        return v
    return default


def cmd_balance(args):
    print(json.dumps(request("GET", "/balance"), indent=2))


def cmd_character(args):
    view = opt(args, "--view", "low top-down")
    seed = opt(args, "--seed")
    ref = opt(args, "--reference")
    name, desc, size = args[:3]
    w, h = (int(x) for x in size.lower().split("x"))
    body = {"description": desc, "name": name, "image_size": {"width": w, "height": h},
            "view": view, "no_background": True,
            "outline": "single color black outline", "detail": "medium detail"}
    if seed: body["seed"] = int(seed)
    if ref: body["reference_image"] = b64_image(ref)
    r = request("POST", "/create-character-v3", body)
    print("character_id:", r["character_id"], "usage:", r.get("usage"))
    poll(r["background_job_id"])
    return r["character_id"]


def cmd_animate(args):
    dirs = opt(args, "--directions", "east").split(",")
    char_id, template = args[:2]
    body = {"character_id": char_id, "mode": "template", "template_animation_id": template,
            "directions": dirs, "animation_name": template}
    r = request("POST", "/characters/animations", body)
    print("jobs:", r["background_job_ids"], "directions:", r["directions"])
    for j in r["background_job_ids"]:
        poll(j)


def cmd_export(args):
    char_id, out = args[:2]
    for attempt in range(30):
        try:
            data = request("GET", f"/characters/{char_id}/zip", raw=True)
            break
        except SystemExit as e:
            if "HTTP 423" in str(e):
                print("  still generating, waiting"); time.sleep(5); continue
            raise
    os.makedirs(out, exist_ok=True)
    zipfile.ZipFile(io.BytesIO(data)).extractall(out)
    for root, _, files in os.walk(out):
        for f in sorted(files):
            print(os.path.relpath(os.path.join(root, f), out))


def cmd_job(args):
    print(json.dumps(request("GET", f"/background-jobs/{args[0]}"), indent=2)[:4000])


def trim_box(img):
    bbox = img.getbbox()
    return bbox


def cmd_sheet(args):
    """Assemble 2 idle + 4 walk frames (one direction) into a single-row sheet.

    Frames are bottom-aligned and horizontally centred in WxH cells so the
    feet sit on the bottom edge, matching the manifest contract."""
    from PIL import Image
    idle = opt(args, "--idle", "breathing-idle")
    walk = opt(args, "--walk", "walk")
    direction = opt(args, "--dir", "east")
    walk_pick = opt(args, "--walk-frames")  # e.g. 0,2,4,6
    src, w, h, out = args[0], int(args[1]), int(args[2]), args[3]

    def frames(name):
        d = os.path.join(src, "animations", name, direction)
        if not os.path.isdir(d):
            sys.exit(f"missing {d}")
        return [Image.open(os.path.join(d, f)).convert("RGBA") for f in sorted(os.listdir(d)) if f.endswith(".png")]

    idle_frames, walk_frames = frames(idle), frames(walk)
    print(f"idle {len(idle_frames)} frames, walk {len(walk_frames)} frames, size {walk_frames[0].size}")
    if walk_pick:
        picks = [int(i) for i in walk_pick.split(",")]
    else:
        n = len(walk_frames)
        picks = [round(i * n / 4) % n for i in range(4)]
    chosen = [idle_frames[0], idle_frames[len(idle_frames) // 2]] + [walk_frames[i] for i in picks]

    # Shared bottom line: use the lowest opaque pixel across all frames so the
    # character does not bob between frames.
    bottoms = [f.getbbox()[3] for f in chosen if f.getbbox()]
    base = max(bottoms)
    sheet = Image.new("RGBA", (w * 6, h), (0, 0, 0, 0))
    for i, f in enumerate(chosen):
        bb = f.getbbox()
        cx = (bb[0] + bb[2]) // 2 if bb else f.width // 2
        # place so that `base` maps to h and cx maps to w/2
        ox = w // 2 - cx
        oy = h - base
        cell = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        cell.alpha_composite(f, (ox, oy)) if ox >= 0 and oy >= 0 else cell.paste(f, (ox, oy), f)
        sheet.paste(cell, (i * w, 0))
        if bb and (bb[2] - bb[0] > w or bb[3] - bb[1] > h):
            print(f"  warning: frame {i} content {bb[2]-bb[0]}x{bb[3]-bb[1]} exceeds cell {w}x{h}")
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    sheet.save(out)
    print("wrote", out, sheet.size, "walk picks", picks)


def image_size(path):
    from PIL import Image
    with Image.open(path) as im:
        return {"width": im.width, "height": im.height}


def cmd_image(args):
    """Generate a single pixel-art image with /generate-image-v2 (Pro).

    image "description" WxH OUT_PNG [--reference photo.jpg "how to use it"]...
        [--style style.png] [--seed N] [--background]"""
    refs = []
    while "--reference" in args:
        i = args.index("--reference")
        refs.append((args[i + 1], args[i + 2]))
        del args[i:i + 3]
    style = opt(args, "--style")
    seed = opt(args, "--seed")
    keep_bg = "--background" in args
    if keep_bg: args.remove("--background")
    desc, size, out = args[:3]
    w, h = (int(x) for x in size.lower().split("x"))
    body = {"description": desc, "image_size": {"width": w, "height": h}, "no_background": not keep_bg}
    if seed: body["seed"] = int(seed)
    if refs:
        body["reference_images"] = [{"image": b64_image(p), "size": image_size(p), "usage_description": u} for p, u in refs]
    if style:
        body["style_image"] = {"image": b64_image(style), "size": image_size(style)}
        body["style_options"] = {"color_palette": False, "outline": True, "detail": True, "shading": True}
    r = request("POST", "/generate-image-v2", body)
    print("job:", r["background_job_id"], "usage:", r.get("usage"))
    j = poll(r["background_job_id"])
    last = j.get("last_response") or {}
    imgs = last.get("images") or ([last["image"]] if "image" in last else [])
    print("usage:", last.get("usage"), "images:", len(imgs))
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    for k, im in enumerate(imgs):
        path = out if len(imgs) == 1 else out.replace(".png", f"_{k}.png")
        with open(path, "wb") as f:
            f.write(base64.b64decode(im["base64"].split(",")[-1]))
        print("wrote", path)


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in globals().get("__cmds__", {}) and f"cmd_{sys.argv[1]}" not in globals():
        sys.exit(__doc__)
    globals()[f"cmd_{sys.argv[1]}"](sys.argv[2:])
