export interface Subtitle {
  text: string;
  time: {
    total: number;
    minutes?: number;
    seconds?: number;
    hundredths?: number;
  };
}

export interface LyrixSubtitle {
  startTimeMs: string;
  words: string;
}
