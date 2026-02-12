export type MaterialType = 'prompt' | 'content' | 'document';

export type Material = {
    id: string;
    created_at: string;
    updated_at: string;
    title: string;
    type: MaterialType;
    content: string | null;
    tags: string[] | null;
    is_public: boolean;
};
