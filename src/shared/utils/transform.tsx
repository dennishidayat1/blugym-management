export function ToCamelCase<T extends Record<string, any>>(obj: T): any {
  const newObj: any = {}
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    newObj[camelKey] = obj[key]
  }
  return newObj
}

export function ToSnakeCase<T extends Record<string, any>>(obj: T): any {
  const newObj: any = {}
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    newObj[snakeKey] = obj[key]
  }
  return newObj
}
