# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- `npm install` - Install dependencies
- `npm run dev` - Start development server - do not use this as it will run forever!
- `npm run build` - Build for production
- `npm run serve` - Preview production build

## Code Style
- **Formatting**: Use consistent indentation (2 spaces)
- **Imports**: Group imports by type (SolidJS, third-party, internal)
- **Types**: Use TypeScript with strict mode enabled
- **Components**: Use functional components with proper type annotations
- **Naming**: Use PascalCase for components, camelCase for variables/functions
- **CSS**: Use CSS modules with kebab-case class names
- **Error Handling**: Use try/catch blocks with meaningful error messages
- **File Structure**: One component per file, named the same as the component

## Project Context
This is a SolidJS application using TypeScript and Vite as the build tool. Follow SolidJS best practices for reactivity and component design.
