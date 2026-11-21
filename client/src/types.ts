export interface Concert {
  id: string;
  title: string;
  genre: string;
  kind: string;
  artist: string;
  city: string;
  place: string;
  date: string;
  time: string | null;
  dateLabel: string | null;
  desc: string;
  source: string;
  ticketUrl: string | null;
  cover: string;
  coverPosition: string | null;
  credit: string;
  featured: boolean;
}
export interface Rating {
  eventId: string;
  average: number;
  count: number;
  mine: number | null;
}
export interface Ticket {
  number: number;
  eventId: string;
  title: string;
  date: string;
  time: string | null;
  city: string;
  place: string;
  requestId: string;
}
export interface Session {
  user: { name: string } | null;
  tickets: Ticket[];
  ratings: Rating[];
}
export interface Credentials {
  email: string;
  password: string;
  name?: string;
}
