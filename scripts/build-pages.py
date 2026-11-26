"""Build the standalone Pages app from the editable product fragment.
Only project-owned markup/styles/code and separately licensed vendors are shipped;
the Codex preview wrapper/runtime is not redistributed.
"""
from pathlib import Path
import shutil
import json
import base64
root=Path(__file__).resolve().parents[1]
source=root/'src/seminar-board.html'
fragment=source.read_text()
brand=json.loads((root/'src/brand-defaults.json').read_text())
brand_assets=root/'assets/brand/hanmadi'
for name,file in {'symbolBlack':'c-symbol-black.svg','symbolWhite':'c-symbol-white.svg','symbolCoral':'c-symbol-coral.svg','wordmarkBlack':'c-horizontal-black.svg','wordmarkWhite':'c-horizontal-white.svg'}.items():
    brand[name]='data:image/svg+xml;base64,'+base64.b64encode((brand_assets/file).read_bytes()).decode()
brand_start='/* HANMADI_BRAND_DEFAULTS_START */'
brand_end='/* HANMADI_BRAND_DEFAULTS_END */'
if brand_start in fragment:
    before,rest=fragment.split(brand_start,1)
    _,after=rest.split(brand_end,1)
    fragment=before+brand_start+'\nconst defaultBrand='+json.dumps(brand,ensure_ascii=True)+';\n'+brand_end+after
for name,filename in [('SUPABASE_CLIENT','supabase-client.js'),('SUPABASE_UI','supabase-ui.js')]:
    a='/* HANMADI_'+name+'_START */'
    b='/* HANMADI_'+name+'_END */'
    if a in fragment:
        before,rest=fragment.split(a,1)
        _,after=rest.split(b,1)
        fragment=before+a+'\n'+(root/'src'/filename).read_text()+'\n'+b+after
transport_start='/* HANMADI_SHEETS_TRANSPORT_START */'
transport_end='/* HANMADI_SHEETS_TRANSPORT_END */'
if transport_start in fragment:
    before,rest=fragment.split(transport_start,1)
    _,after=rest.split(transport_end,1)
    fragment=before+transport_start+'\n'+(root/'src/sheets-transport.js').read_text()+'\n'+transport_end+after
start='/* HANMADI_SHEETS_UI_START */'
end='/* HANMADI_SHEETS_UI_END */'
if start in fragment:
    before,rest=fragment.split(start,1)
    _,after=rest.split(end,1)
    fragment=before+start+'\n'+(root/'src/sheets-ui.js').read_text()+'\n'+end+after
    source.write_text(fragment)
translation_start='/* HANMADI_SHEETS_I18N_START */'
translation_end='/* HANMADI_SHEETS_I18N_END */'
translations=json.loads((root/'src/sheets-i18n.json').read_text())
translations.update(json.loads((root/'src/supabase-i18n.json').read_text()))
translations.update(json.loads((root/'src/sheets-beginner-i18n.json').read_text()))
ux_copy=json.loads((root/'src/ux-copy.json').read_text())
for old,copy in sorted(ux_copy['messages'].items(),key=lambda item:-len(item[0])):
    fragment=fragment.replace('>'+old+'<','>'+copy['ko']+'<')
    for quote in ["'",'"']:
        fragment=fragment.replace(quote+old+quote,quote+copy['ko']+quote)
    translations[copy['ko']]=copy['en']
    translations[old]=copy['en']
for old,copy in ux_copy['terms'].items():
    fragment=fragment.replace(old,copy['ko'])
    for ko,en in list(translations.items()):
        if old in ko:translations[ko.replace(old,copy['ko'])]=en
translation_block=translation_start+'\nObject.assign(englishChrome,'+json.dumps(translations,ensure_ascii=False)+');\n'+translation_end+'\n'
if translation_start in fragment:
    before,rest=fragment.split(translation_start,1)
    _,after=rest.split(translation_end,1)
    fragment=before+translation_block+after
else:
    fragment=fragment.replace('  const originalChrome=',translation_block+'  const originalChrome=',1)
ux_translations={}
for old,copy in [*ux_copy['messages'].items(),*ux_copy['terms'].items()]:
    ux_translations[old]=copy['en']
    ux_translations[copy['ko']]=copy['en']
ux_start='/* HANMADI_UX_COPY_START */'
ux_end='/* HANMADI_UX_COPY_END */'
ux_block=ux_start+'\nObject.assign(englishChrome,'+json.dumps(ux_translations,ensure_ascii=False)+');\n'+ux_end+'\n'
if ux_start in fragment:
    before,rest=fragment.split(ux_start,1)
    _,after=rest.split(ux_end,1)
    fragment=before+ux_block+after
else:
    fragment=fragment.replace('  function englishText(',ux_block+'  function englishText(',1)
resources={name:(root/'integrations/google-sheets'/name).read_text() for name in ['Code.gs','Bridge.html']}
resources_start='/* HANMADI_SHEETS_RESOURCES_START */'
resources_end='/* HANMADI_SHEETS_RESOURCES_END */'
before,rest=fragment.split(resources_start,1)
_,after=rest.split(resources_end,1)
fragment=before+resources_start+'\nconst resources='+json.dumps(resources,ensure_ascii=True).replace('<','\\u003c')+';\n'+resources_end+after
source.write_text(fragment)
fragment=fragment.replace('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js','./vendor/qrcode.js')
fragment=fragment.replace('  setInterval(()=>tickSession(),250);', (root/'src/forms-ui.js').read_text()+'\n  setInterval(()=>tickSession(),250);')
page='''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Hanmadi — Questions, feedback, and guestbooks</title><link rel="icon" type="image/svg+xml" href="./assets/brand/hanmadi/c-symbol-coral.svg"><link rel="apple-touch-icon" href="./assets/brand/hanmadi/little-host-coral-512.png">
<style>html,body{margin:0;min-height:100%;background:#f5f4f0}body{padding:16px;box-sizing:border-box}body:has(#seminar-prototype[data-appearance=dark]){background:#272822}body:has(#seminar-prototype[data-external-role=participant]){padding:0}button,input,textarea,select{box-sizing:border-box}p,h1,h2,h3{margin:0}dialog::backdrop{background:#10122288}</style>
<script>window.SEMINAR_STATIC_APP=true;</script><script src="./event-config.js"></script><script src="./event-links.js"></script><script src="./form-source.js"></script><script src="./vendor/lucide.min.js"></script></head><body>
'''+fragment+'''\n<script>if(window.lucide)lucide.createIcons();</script></body></html>\n'''
page=page.replace('background:#f5f4f0','background:'+brand['background'])
(root/'public/index.html').write_text(page)
shutil.copytree(brand_assets,root/'public/assets/brand/hanmadi',dirs_exist_ok=True)
(root/'public/.nojekyll').touch()
shutil.copytree(root/'integrations/google-sheets',root/'public/integrations/google-sheets',dirs_exist_ok=True)
shutil.copytree(root/'integrations/google-forms',root/'public/integrations/google-forms',dirs_exist_ok=True)
shutil.copytree(root/'integrations/supabase',root/'public/integrations/supabase',dirs_exist_ok=True)
shutil.copytree(root/'licenses',root/'public/licenses',dirs_exist_ok=True)
(root/'public/THIRD_PARTY_NOTICES.md').write_text((root/'THIRD_PARTY_NOTICES.md').read_text().replace('(public/','('))
print('Built public/index.html and preserved third-party notices.')
