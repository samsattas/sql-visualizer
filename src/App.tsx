import SQLVisualizer from './SQLVisualizer';
import { LangProvider } from './i18n';

export default function App() {
  return (
    <LangProvider>
      <div className="w-full h-full">
        <SQLVisualizer />
      </div>
    </LangProvider>
  );
}
