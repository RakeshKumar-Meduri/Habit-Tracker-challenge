import os
import zipfile

zip_path = 'pulse-dist.zip'
dist_dir = 'dist'

if not os.path.exists(dist_dir):
    raise SystemExit('dist directory does not exist. Run npm run build first.')

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(dist_dir):
        for d in dirs:
            full_dir = os.path.join(root, d)
            rel_dir = os.path.relpath(full_dir, dist_dir).replace('\\', '/') + '/'
            zi = zipfile.ZipInfo(rel_dir)
            zi.external_attr = 0o755 << 16  # drwxr-xr-x
            z.writestr(zi, '')
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, dist_dir).replace('\\', '/')
            with open(full_path, 'rb') as fp:
                data = fp.read()
            zi = zipfile.ZipInfo(rel_path)
            zi.external_attr = 0o644 << 16  # -rw-r--r--
            z.writestr(zi, data)

print(f"Successfully packaged '{zip_path}' with POSIX permissions (755 dirs, 644 files).")
