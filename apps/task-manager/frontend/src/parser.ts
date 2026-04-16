export interface ParsedTask {
  title: string;
  due_date?: number;
  priority?: number;
  labels: string[];
  project?: string;
}

export function parseNaturalLanguage(input: string): ParsedTask {
  const result: ParsedTask = { title: input, labels: [] };
  let text = input;

  // Parse priority (p1, p2, p3, p4, P1, etc.)
  const priorityMatch = text.match(/\b[pP](\d)\b/);
  if (priorityMatch) {
    result.priority = parseInt(priorityMatch[1], 10);
    text = text.replace(priorityMatch[0], '').trim();
  }

  // Parse due dates
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (/\btomorrow\b/i.test(text)) {
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    result.due_date = tomorrow.getTime();
    text = text.replace(/\btomorrow\b/i, '').trim();
  } else if (/\bToday\b/i.test(text)) {
    result.due_date = todayStart;
    text = text.replace(/\bToday\b/i, '').trim();
  } else if (/\byesterday\b/i.test(text)) {
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    result.due_date = yesterday.getTime();
    text = text.replace(/\byesterday\b/i, '').trim();
  }

  // Parse labels (#urgent, #work, etc.)
  const labelMatches = text.match(/#[a-zA-Z0-9_-]+/g) || [];
  labelMatches.forEach(label => {
    result.labels.push(label);
    text = text.replace(label, '').trim();
  });

  // Parse project (@personal, @work, @learn-devops, etc.)
  const projectMatch = text.match(/@[a-zA-Z0-9_-]+/);
  if (projectMatch) {
    result.project = projectMatch[0].substring(1); // remove @
    text = text.replace(projectMatch[0], '').trim();
  }

  result.title = text.trim();
  return result;
}
