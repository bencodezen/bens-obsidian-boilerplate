<%*
const title = tp.file.title

// "Book" Notes
if (title.includes('(Book)')) {
	return tp.file.include('[[Book (Template)]]')
}
// "People" Notes
else if (title.startsWith("@")) {
 	await tp.file.move("/people/" + title)
 	return tp.file.include('[[People (Template)]]')
} 
// "Starter" Note
else {
	return tp.file.include('[[Starter Note (Template)]]')
}
%>
