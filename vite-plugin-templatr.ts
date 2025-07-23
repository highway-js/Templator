import type { Plugin } from 'vite'

export default function templatrPlugin(): Plugin {
	return {
		name: 'vite-plugin-templatr',
		enforce: 'pre',
		transform(code, id) {
			if (!id.endsWith('.hway')) return

			const scriptMatch = code.match(/<script>([\s\S]*?)<\/script>/)
			const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/)

			if (!templateMatch) {
				console.warn(`[templatr] Missing <template> in ${id}`)
				return
			}

			const scriptContent = scriptMatch?.[1]?.trim() ?? ''
			const templateContent = templateMatch[1].trim()

			// Находим все const переменные из <script>
			const constVars = Array.from(
				scriptContent.matchAll(/const\s+(\w+)\s*=/g)
			).map(match => match[1])

			// Формируем объект контекста
			const contextObject =
				constVars.length > 0
					? `{\n${constVars.map(v => `  ${v}: ${v}`).join(',\n')}\n}`
					: '{}'

			// Генерируем код компонента
			const result = `
${scriptContent}

const getContext = () => ${contextObject};

export default {
  template: ${JSON.stringify(templateContent)},
  getContext
}
`

			return {
				code: result,
				map: null,
			}
		},
	}
}
