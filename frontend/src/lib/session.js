export function getStoredStudent() {
  const storedStudent = localStorage.getItem("virtualTutorStudent");
  if (!storedStudent) {
    return null;
  }

  const parsedStudent = JSON.parse(storedStudent);
  if (!parsedStudent.semester && parsedStudent.year) {
    parsedStudent.semester = parsedStudent.year * 2;
    localStorage.setItem("virtualTutorStudent", JSON.stringify(parsedStudent));
  }

  return parsedStudent;
}

export function setStoredStudent(student) {
  localStorage.setItem("virtualTutorStudent", JSON.stringify(student));
}

export function clearStoredStudent() {
  localStorage.removeItem("virtualTutorStudent");
}
