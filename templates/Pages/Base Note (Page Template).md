<%*
const title = tp.file.title
const dailyNoteRegex = /^(\d{4}-\d{2}-\d{2})/g

// "App" Notes
if (title.includes('(App)')) {
	return tp.file.include('[[App (Page Template)]]')
}
// "Book" Notes
else if (title.includes('(Book)')) {
	return tp.file.include('[[Book (Page Template)]]')
}
// "Build with Ben - Episode" Notes
else if (title.startsWith('Build with Ben (E')) {
	return tp.file.include('[[Build with Ben Episode (Page Template)]]')
}
// "Daily" Notes
else if (dailyNoteRegex.test(title)) {
  await tp.file.move("/reports/timeline/Daily Notes/" + title)
  return tp.file.include('[[Daily Note (Page Template)]]')
}
// "Focus Session"
else if (title.startsWith("Focus Session")) {
  return tp.file.include('[[Focus Session (Page Template)]]')
}
// "Japanese Tutoring Session" Notes
else if (title.startsWith("Japanese Tutoring Session")) {
	return tp.file.include('[[Japanese Tutoring Session (Page Template)]]')
}
// "Meeting (Sync)" Notes
else if (title.startsWith("Sync with")) {
  return tp.file.include('[[Generic Meeting (Page Template)]]')
}
// "Music Lesson" Notes
else if (title.startsWith("Music Lesson")) {
  return tp.file.include('[[Music Lessons (Page Template)]]')
}
// "Obsidian Office Hours - Episode" Notes
else if (title.startsWith("Obsidian Office Hours (E")) {
  return tp.file.include('[[Obsidian Office Hours (Page Template)]]')
}
// "People" Notes
else if (title.startsWith("@")) {
 	await tp.file.move("/zettelkasten/people/" + title)
 	return tp.file.include('[[People (Person) — Page Template]]')
} 
// "Project" Notes
else if (title.includes('(Project)')) {
  return tp.file.include('[[Project (Page Template)]]')
}
// "Starter" Note
else {
	return tp.file.include('[[Starter Note (Page Template)]]')
}
%>