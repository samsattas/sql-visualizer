import React, { createContext, useContext, useState } from 'react';

export type Lang = 'en' | 'es';

const translations = {
  en: {
    // Top bar
    appName: 'SQL VISUALIZER',
    tabAnalyzer: 'Script Analyzer',
    tabDependencies: 'Dependency Map',
    collapseInput: 'Collapse input',
    expandInput: 'Expand input',
    placeholder: 'Paste your SQL script here...',
    analyzing: 'ANALYZING...',
    analyzeScript: 'ANALYZE SCRIPT',
    defaultContext: 'Default Context',
    analyzedOn: 'Analyzed on',
    noNodes: 'No execution nodes detected.',
    noNodesHint: 'Try adding SELECT, INSERT, UPDATE, or DELETE statements.',

    // Dependency Graph — upload screen
    loadTitle: 'Load SQL Scripts',
    loadDesc: 'Drop a folder or SQL files here, or use the buttons below. Each file should contain one CREATE PROCEDURE.',
    loadFolder: 'Load Folder',
    selectFiles: 'Select Files',

    // Dependency Graph — toolbar
    scripts: 'scripts',
    external: 'external',
    dependencies: 'dependencies',
    isolated: 'isolated',
    searchPlaceholder: 'Search...',
    reset: 'Reset',
    loadNewFiles: 'Load new files',

    // Dependency Graph — panels
    isolatedLabel: 'Isolated',
    details: 'Details',
    externalBadge: 'External — not in project',
    externalSmall: 'external',
    callsLabel: 'Calls',
    calledByLabel: 'Called by',
    line: 'line',
    lines: 'lines',
    occurrence: 'occurrence',
    noSnippet: 'No snippet available',

    // Sidebar
    parametersAndVars: 'Parameters & Variables',
    leftPanel: 'Left panel',
    parameters: 'Parameters',
    noParameters: 'No parameters detected',
    internalVars: 'Internal Variables',
    noVariables: 'No variables declared',
    dataMap: 'Data Map',
    noTables: 'No tables detected',
    default_: 'def',

    // CodeView
    sourceCode: 'Source Code',

    // SummaryFooter
    operations: 'Operations',
    selectOp: 'SELECT (READ)',
    insertOp: 'INSERT (CREATE)',
    updateOp: 'UPDATE (MODIFY)',
    deleteOp: 'DELETE (REMOVE)',
    execOp: 'EXEC (CALL)',
    databases: 'Databases',
    tables: 'Tables',
    errorHandling: 'Error Handling',
    transactions: 'Transactions',
    enabled: 'ENABLED',
    active: 'ACTIVE',
    none: 'NONE',
    noneTooltip: 'None',
  },
  es: {
    // Top bar
    appName: 'SQL VISUALIZADOR',
    tabAnalyzer: 'Analizador',
    tabDependencies: 'Mapa de Dependencias',
    collapseInput: 'Colapsar entrada',
    expandInput: 'Expandir entrada',
    placeholder: 'Pega tu script SQL aquí...',
    analyzing: 'ANALIZANDO...',
    analyzeScript: 'ANALIZAR SCRIPT',
    defaultContext: 'Contexto por Defecto',
    analyzedOn: 'Analizado el',
    noNodes: 'No se detectaron nodos de ejecución.',
    noNodesHint: 'Intenta agregar SELECT, INSERT, UPDATE o DELETE.',

    // Dependency Graph — upload screen
    loadTitle: 'Cargar Scripts SQL',
    loadDesc: 'Suelta una carpeta o archivos SQL aquí, o usa los botones abajo. Cada archivo debe contener un CREATE PROCEDURE.',
    loadFolder: 'Cargar Carpeta',
    selectFiles: 'Seleccionar Archivos',

    // Dependency Graph — toolbar
    scripts: 'scripts',
    external: 'externos',
    dependencies: 'dependencias',
    isolated: 'aislados',
    searchPlaceholder: 'Buscar...',
    reset: 'Reiniciar',
    loadNewFiles: 'Cargar nuevos archivos',

    // Dependency Graph — panels
    isolatedLabel: 'Aislados',
    details: 'Detalles',
    externalBadge: 'Externo — no está en el proyecto',
    externalSmall: 'externo',
    callsLabel: 'Llama a',
    calledByLabel: 'Llamado por',
    line: 'línea',
    lines: 'líneas',
    occurrence: 'ocurrencia',
    noSnippet: 'Sin fragmento disponible',

    // Sidebar
    parametersAndVars: 'Parámetros y Variables',
    leftPanel: 'Panel izquierdo',
    parameters: 'Parámetros',
    noParameters: 'Sin parámetros detectados',
    internalVars: 'Variables Internas',
    noVariables: 'Sin variables declaradas',
    dataMap: 'Mapa de Datos',
    noTables: 'Sin tablas detectadas',
    default_: 'def',

    // CodeView
    sourceCode: 'Código Fuente',

    // SummaryFooter
    operations: 'Operaciones',
    selectOp: 'SELECT (LECTURA)',
    insertOp: 'INSERT (CREAR)',
    updateOp: 'UPDATE (MODIFICAR)',
    deleteOp: 'DELETE (ELIMINAR)',
    execOp: 'EXEC (LLAMAR)',
    databases: 'Bases de Datos',
    tables: 'Tablas',
    errorHandling: 'Manejo de Errores',
    transactions: 'Transacciones',
    enabled: 'ACTIVO',
    active: 'ACTIVA',
    none: 'NINGUNA',
    noneTooltip: 'Ninguna',
  },
} as const;

export type Translations = typeof translations.en;

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const LangContext = createContext<LangContextType>({
  lang: 'es',
  setLang: () => {},
  t: translations.es,
});

export const LangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('es');
  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext);
