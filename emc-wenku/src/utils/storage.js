export function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key)
    return value === null ? fallback : JSON.parse(value)
  } catch {
    return fallback
  }
}

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`Unable to save ${key} to localStorage`, error)
    return false
  }
}

export function readFlag(key) {
  try {
    return window.localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

export function writeFlag(key, value) {
  try {
    if (value) window.localStorage.setItem(key, 'true')
    else window.localStorage.removeItem(key)
  } catch (error) {
    console.error(`Unable to save ${key} to localStorage`, error)
  }
}
