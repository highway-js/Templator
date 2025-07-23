declare module '*.hway' {
	interface TemplateComponent {
		template: string
		config: {
			services: any[]
			directives?: any[]
		}
	}

	const component: TemplateComponent
	export default component
}
