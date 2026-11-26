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
            if path.is_file() and path.name!='.DS_Store' and not(update and path.name in ['event-config.js','share-config.json','event-links.js']):
                archive.write(path,path.relative_to(root/'public'))
        archive.write(out/'README.md','README.md')
        for guide in ['GOOGLE_SHEETS_UPDATE.md','CONNECTIONS_UPDATE.md']:
            if (out/guide).exists():archive.write(out/guide,guide)
        for path in (root/'docs').rglob('*'):
            if path.is_file() and path.name!='.DS_Store':archive.write(path,path.relative_to(root))
    with ZipFile(out/name) as archive:
        assert archive.testzip() is None
        for required in ['index.html','404.html','vendor/supabase.min.js','integrations/google-sheets/Bridge.html','integrations/supabase/install.sql','integrations/supabase/share-links.sql','licenses/supabase-js/LICENSE']:
            assert required in archive.namelist(),required
        if update:
            for settings in ['event-config.js','share-config.json','event-links.js']:assert settings not in archive.namelist()
        else:assert 'share-config.json' in archive.namelist()
    print(f'Packaged {name}: {(out/name).stat().st_size:,} bytes')
