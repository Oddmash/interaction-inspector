declare module '*.scss?inline' {
  const css: string;
  export default css;
}
declare module '*.css?inline' {
  const styles: string;
  export default styles;
}
