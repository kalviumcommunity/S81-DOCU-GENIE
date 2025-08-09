export interface Message {
    sender: "user" | "bot";
    text: string;
    timestamp: string;
  }
  
  export interface FashionRecommendation {
    skin_tone: string;
    recommended_outfit_men : string;
    why_this_outfit_men: string;
    shade: string;
    preferred_colors: string;
    style: string;
  }