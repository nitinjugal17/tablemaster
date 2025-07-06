// src/lib/types/feedback.types.ts
export interface FeedbackCategory {
    id: string;
    name: string;
    description?: string;
}

export const defaultFeedbackCategories: FeedbackCategory[] = [
    { id: 'cat-1', name: 'Food Quality', description: 'Feedback related to the taste, presentation, and quality of the food.' },
    { id: 'cat-2', name: 'Service', description: 'Comments on staff friendliness, attentiveness, and efficiency.' },
    { id: 'cat-3', name: 'Ambiance', description: 'Feedback about the restaurant\'s atmosphere, decor, and music.' },
    { id: 'cat-4', name: 'Cleanliness', description: 'Comments regarding the cleanliness of the premises.' },
    { id: 'cat-5', name: 'Value for Money', description: 'Feedback on whether the price was fair for the experience.' },
    { id: 'cat-6', name: 'Other', description: 'General feedback not covered by other categories.' },
];

export interface Feedback {
    id: string;
    rating: number; // e.g., 1-5
    category: string; // From FeedbackCategory name
    comments: string;
    customerName?: string;
    contactInfo?: string; // Optional email or phone
    createdAt: string; // ISO 8601
    source?: 'qr_code' | 'app' | 'manual';
}
