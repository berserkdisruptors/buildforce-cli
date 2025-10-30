declare module 'gradient-string' {
  type Input = string;
  type GradientFunc = (text: string) => string;
  interface GradientFactory {
    (colors: string[] | string): GradientFunc;
  }
  const gradient: GradientFactory & {
    atlantis: GradientFunc;
    rainbow: GradientFunc;
  };
  export default gradient;
}


