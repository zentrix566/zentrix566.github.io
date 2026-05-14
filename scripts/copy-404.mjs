import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

copyFileSync(resolve('404.html'), resolve('dist/404.html'))
