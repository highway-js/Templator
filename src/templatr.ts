export interface TemplateConfig {
	services: any[]
	directives?: any[]
}

export async function renderComponent(
	path: string,
	mountId: string = 'app'
): Promise<void> {
	const html = await fetch(path).then(res => res.text())

	const configMatch = html.match(/@Template\s*\(([\s\S]*?)\)\s*<template>/)
	if (!configMatch) throw new Error('Missing @Template declaration')

	const config: TemplateConfig = eval(`(${configMatch[1]})`)
	const services = config.services || []

	const templateMatch = html.match(/<template>([\s\S]*?)<\/template>/)
	if (!templateMatch) throw new Error('Missing <template> block')

	const template = templateMatch[1].trim()

	const context: Record<string, any> = {}

	for (const service of services) {
		const module = await import(`./services/${service.name}.js`)
		const instance = module[service.name]
		const alias = serviceNameToContextKey(service.name)

		for (const key in instance) {
			if (!(key in context)) {
				context[key] = instance[key]
			}
		}
	}

	const rendered = compileTemplate(template, context)
	document.getElementById(mountId)!.innerHTML = rendered
}

function serviceNameToContextKey(name: string): string {
	return name.charAt(0).toLowerCase() + name.slice(1)
}

function compileTemplate(
	template: string,
	context: Record<string, any>
): string {
	const lines = template.split('\n')
	const stack: any[] = []
	let output = ''

	const evalInContext = (expr: string, ctx: Record<string, any>): any => {
		try {
			return Function(
				...Object.keys(ctx),
				`return (${expr})`
			)(...Object.values(ctx))
		} catch (e) {
			console.warn(`Eval error in expression "${expr}":`, e)
			return ''
		}
	}

	for (let rawLine of lines) {
		const line = rawLine.trim()

		if (line.startsWith('@if')) {
			const cond = line.match(/@if\s*{(.*)}/)?.[1].trim()
			const active = cond ? evalInContext(cond, context) : false
			stack.push({ type: 'if', active })
			continue
		}

		if (line.startsWith('@for')) {
			const expr = line.match(/@for\s*{(.*)}/)?.[1].trim()
			const match = expr?.match(/let\s+(\w+)\s+of\s+(.*)/)
			if (!match) continue

			const [, varName, iterableExpr] = match
			const items = evalInContext(iterableExpr, context)
			stack.push({ type: 'for', varName, items, buffer: [] })
			continue
		}

		if (line.startsWith('@end')) {
			const block = stack.pop()

			if (block.type === 'for') {
				for (const item of block.items) {
					const scopedContext = { ...context, [block.varName]: item }
					output += compileTemplate(block.buffer.join('\n'), scopedContext)
				}
			}

			continue
		}

		const current = stack[stack.length - 1]

		if (current?.type === 'for') {
			current.buffer.push(line)
			continue
		}

		if (current?.type === 'if' && !current.active) {
			continue
		}

		const renderedLine = line.replace(/{{\s*(\w+)\s*}}/g, (_, key) =>
			context[key] !== undefined ? context[key] : ''
		)

		output += renderedLine + '\n'
	}

	return output
}
