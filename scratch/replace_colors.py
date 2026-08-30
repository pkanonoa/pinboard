import os

dir_path = r'c:\pinboard\src'

exact_replacements = {
    'bg-[#0a0f1a]': 'bg-[var(--bg-primary)]',
    'bg-[#1a2535]': 'bg-[var(--bg-card)]',
    'bg-[#141522]': 'bg-[var(--bg-card)]',
    'bg-[#171926]': 'bg-[var(--bg-card)]',
    'bg-[#0d0e17]': 'bg-[var(--bg-card)]',
    'bg-[#1a1b26]': 'bg-[var(--bg-card)]',
    'text-white': 'text-[var(--text-primary)]',
    'text-gray-400': 'text-[var(--text-secondary)]',
    'border-gray-800': 'border-[var(--border)]',
    'text-teal-400': 'text-[var(--accent-teal)]',
    'text-emerald-400': 'text-[var(--success)]',
    'text-red-400': 'text-[var(--danger)]',
    'text-amber-400': 'text-[var(--warning)]',
    'text-indigo-400': 'text-[var(--accent-purple)]',
}

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for old, new in exact_replacements.items():
                new_content = new_content.replace(old, new)
            
            if new_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {file}")
print("Done")
