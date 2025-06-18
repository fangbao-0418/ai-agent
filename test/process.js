const arr = [
  process.env.LOCALAPPDATA,
  process.env.PROGRAMFILES,
  process.env['PROGRAMFILES(X86)'],
]

console.log(arr.join("/n"));