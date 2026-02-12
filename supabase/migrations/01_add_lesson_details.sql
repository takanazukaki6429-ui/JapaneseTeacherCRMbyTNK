-- Add new columns for structured lesson data
alter table public.lessons 
add column if not exists topics text, -- 文法・トピック
add column if not exists vocabulary text, -- 語彙
add column if not exists mistakes text, -- つまずき・弱点
add column if not exists materials text; -- 使用教材・資料
