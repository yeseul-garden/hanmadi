"""Build upload-ready GitHub Pages ZIPs without replacing published event settings."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import subprocess
import sys

root=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(root/'scripts/build-pages.py')],check=True)
out=root/'outputs'
for name,update in [('hanmadi-connections-update.zip',True),('hanmadi-google-sheets-update.zip',True),('hanmadi-demo.zip',False)]:
    with ZipFile(out/name,'w',ZIP_DEFLATED) as archive:
        for path in (root/'public').rglob('*'):
            if path.is_file() and path.name!='.DS_Store' and not(update and path.name=='event-config.js'):
                archive.write(path,path.relative_to(root/'public'))
        archive.write(out/'README.md','README.md')
        for guide in ['GOOGLE_SHEETS_UPDATE.md','CONNECTIONS_UPDATE.md']:
            if (out/guide).exists():archive.write(out/guide,guide)
        for path in (root/'docs').rglob('*'):
            if path.is_file() and path.name!='.DS_Store':archive.write(path,path.relative_to(root))
    with ZipFile(out/name) as archive:
        assert archive.testzip() is None
        for required in ['index.html','vendor/supabase.min.js','integrations/google-sheets/Bridge.html','integrations/supabase/install.sql','licenses/supabase-js/LICENSE']:
            assert required in archive.namelist(),required
        if update:assert 'event-config.js' not in archive.namelist()
    print(f'Packaged {name}: {(out/name).stat().st_size:,} bytes')
