import { EventItem } from './event';

export enum InputFileType {
  Image = 'image',
  PDF = 'pdf',
  Text = 'text',
  Json = 'json',
  Zip = 'zip',
  Audio = 'audio',
  Video = 'video',
  Keynote = 'keynote',
  Powerpoint = 'powerpoint',
  Excel = 'excel',
  Word = 'word',
  PPTX = 'pptx',
  XLSX = 'xlsx',
  DOCX = 'docx',
  Other = 'other',
  JS = 'js',
  TS = 'ts',
  JSX = 'jsx',
  TSX = 'tsx',
  HTML = 'html',
  CSS = 'css',
  SCSS = 'scss',
  LESS = 'less',
  YAML = 'yaml',
  XML = 'xml',
  TOML = 'toml',
  Python = 'py',
  Java = 'java',
  Rust = 'rs',
  Swift = 'swift',
  Go = 'go',
  C = 'c',
  CPP = 'cpp',
  Stylus = 'stylus',
  PHP = 'php',
  Ruby = 'rb',
  Kotlin = 'kt',
  CSharp = 'cs',
  Draft = 'draft',
}

export interface InputFile {
  type: InputFileType;
  filename?: string;
  content: string;
  size?: number;
  loading?: boolean;
  isScreenshot?: boolean;
  originalFile?: File;
}

interface MessageTypeDescriptor {
  [MessageType.PlainText]: string;
  [MessageType.File]: InputFile;
  [key: string]: unknown;
}

export enum MessageType {
  // Output the chat text directly
  PlainText = 'plain-text',
  // Display the file information
  File = 'file',
  // Output the agent workflow process
  OmegaAgent = 'omega-agent',
}

export interface OmegaAgentData {
  events: EventItem[];
}

export interface MessageContentType extends MessageTypeDescriptor {
  [MessageType.OmegaAgent]: OmegaAgentData;
}

export enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
}

interface MessageItemBase<T extends MessageTypeDescriptor = MessageTypeDescriptor> {
  id?: string;
  role: MessageRole;
  avatar?: string;
  conversationId?: string;
  timestamp?: number;
  isFinal?: boolean;
  type: keyof T;
  content?: T[keyof T];
  isArchived?: boolean;
  isWelcome?: boolean;
  showCopyButton?: boolean;
  isDeleting?: boolean;
}

export type MessageItem = MessageItemBase<MessageContentType>;
