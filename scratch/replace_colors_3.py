import os
import re

dir_path = r'c:\pinboard\src'

exact_replacements = {
    'bg-[#16161f]': 'bg-[var(--bg-card)]',
    'bg-[#13131a]': 'bg-[var(--bg-primary)]',
    'bg-[#181824]': 'bg-[var(--bg-card)]',
    'bg-[#1a1a24]': 'bg-[var(--bg-card)]',
    'bg-[#12131c]': 'bg-[var(--bg-card)]',
    'bg-[#202230]': 'bg-[var(--bg-card-hover)]',
    'bg-[#2a2a35]': 'bg-[var(--bg-card-hover)]',
    'border-[#16161f]': 'border-[var(--border)]',
    'divide-gray-800': 'divide-[var(--border)]',
    'text-gray-200': 'text-[var(--text-primary)]',
    'text-gray-600': 'text-[var(--text-muted)]',
    'text-gray-700': 'text-[var(--text-secondary)]',
    '[color-scheme:dark]': '',
    'bg-gray-100': 'bg-[var(--bg-secondary)]',
    'bg-gray-700': 'bg-[var(--bg-card-hover)]',
    'bg-gray-800': 'bg-[var(--bg-card)]',
    'bg-gray-900': 'bg-[var(--bg-primary)]',
    'border-gray-700': 'border-[var(--border)]',
    'border-gray-800': 'border-[var(--border)]',
    'border-gray-600': 'border-[var(--border)]',
    'text-gray-300': 'text-[var(--text-secondary)]',
    'text-gray-400': 'text-[var(--text-secondary)]',
    'text-gray-500': 'text-[var(--text-muted)]',
    'hover:bg-gray-800': 'hover:bg-[var(--bg-card-hover)]',
    'hover:bg-gray-750': 'hover:bg-[var(--bg-card-hover)]',
    'hover:bg-gray-700': 'hover:bg-[var(--bg-card-hover)]',
    'hover:bg-gray-600': 'hover:bg-[var(--bg-card-hover)]',
    'hover:border-gray-700': 'hover:border-[var(--text-secondary)]',
    'hover:text-gray-300': 'hover:text-[var(--text-primary)]',
    'hover:text-gray-400': 'hover:text-[var(--text-primary)]',
    'text-indigo-300': 'text-[var(--accent-purple)]',
    'bg-[#1e1e28]': 'bg-[var(--bg-card)]',
}

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            # Replacing longer exact matches first helps if there are substrings, 
            # though these are distinct tailwind classes.
            for old, new in sorted(exact_replacements.items(), key=lambda x: len(x[0]), reverse=True):
                new_content = new_content.replace(old, new)
            
            # Additional regex cleanup for multi-space left by [color-scheme:dark] removal
            new_content = re.sub(r' +', ' ', new_content)
            
            if new_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {file}")
print("Done")
