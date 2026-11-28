// agy-Sag — Host UI Multi-Language Dictionary Packs (10 Locales, UMD)
// Covers Google Antigravity 2.x Desktop / IDE native UI chrome with 3-tier offline translation packs.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.__agSagHostI18nPacks = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  const SCHEMA_VERSION = 2;

  const LOCALES = Object.freeze([
    'en',
    'zh-CN',
    'zh-TW',
    'ja',
    'ko',
    'es',
    'fr',
    'de',
    'ru',
    'pt-BR',
  ]);

  const TARGET_LOCALES = Object.freeze(LOCALES.filter((loc) => loc !== 'en'));

  const META = Object.freeze({
    en: Object.freeze({ locale: 'en', nativeName: 'English', englishName: 'English', schemaVersion: SCHEMA_VERSION }),
    'zh-CN': Object.freeze({ locale: 'zh-CN', nativeName: '简体中文', englishName: 'Simplified Chinese', schemaVersion: SCHEMA_VERSION }),
    'zh-TW': Object.freeze({ locale: 'zh-TW', nativeName: '繁體中文', englishName: 'Traditional Chinese', schemaVersion: SCHEMA_VERSION }),
    ja: Object.freeze({ locale: 'ja', nativeName: '日本語', englishName: 'Japanese', schemaVersion: SCHEMA_VERSION }),
    ko: Object.freeze({ locale: 'ko', nativeName: '한국어', englishName: 'Korean', schemaVersion: SCHEMA_VERSION }),
    es: Object.freeze({ locale: 'es', nativeName: 'Español', englishName: 'Spanish', schemaVersion: SCHEMA_VERSION }),
    fr: Object.freeze({ locale: 'fr', nativeName: 'Français', englishName: 'French', schemaVersion: SCHEMA_VERSION }),
    de: Object.freeze({ locale: 'de', nativeName: 'Deutsch', englishName: 'German', schemaVersion: SCHEMA_VERSION }),
    ru: Object.freeze({ locale: 'ru', nativeName: 'Русский', englishName: 'Russian', schemaVersion: SCHEMA_VERSION }),
    'pt-BR': Object.freeze({ locale: 'pt-BR', nativeName: 'Português (Brasil)', englishName: 'Portuguese (Brazil)', schemaVersion: SCHEMA_VERSION }),
  });

  // Proper nouns, acronyms, protocols, model brands & plugin identifiers that must never be translated.
  const KEEP_UNTRANSLATED_EXACT = Object.freeze([
    'Antigravity',
    'Google Antigravity',
    'MCP',
    'Git',
    'GitHub',
    'CLI',
    'IDE',
    'PR',
    'API',
    'JSON',
    'YAML',
    'TOML',
    'SQL',
    'HTML',
    'CSS',
    'DOM',
    'URL',
    'URI',
    'HTTP',
    'HTTPS',
    'SSH',
    'CDP',
    'ASAR',
    'OK',
    'ID',
    'UUID',
    'Orchestrator',
    'Gemini',
    'Claude',
    'Codex',
    'OpenAI',
    'Anthropic',
    'Obsidian Prism',
    'agy-NOV',
    'agy-Sag',
    'Markdown',
    'TypeScript',
    'JavaScript',
    'Node.js',
    'Electron',
    'UTF-8',
  ]);

  const KEEP_SET = new Set(KEEP_UNTRANSLATED_EXACT);

  // Tuple order: [en, zh-CN, zh-TW, ja, ko, es, fr, de, ru, pt-BR]
  const EXACT_ROWS = [
    // ── 1. Navigation & Sidebar ──────────────────────────────────────────────
    ['New Conversation', '新建对话', '新增對話', '新しい会話', '새 대화', 'Nueva conversación', 'Nouvelle conversation', 'Neue Unterhaltung', 'Новый диалог', 'Nova conversa'],
    ['New Chat', '新建聊天', '新增聊天', '新しいチャット', '새 채팅', 'Nuevo chat', 'Nouvelle discussion', 'Neuer Chat', 'Новый чат', 'Novo chat'],
    ['Conversations', '对话', '對話', '会話', '대화', 'Conversaciones', 'Conversations', 'Unterhaltungen', 'Диалоги', 'Conversas'],
    ['Recent Conversations', '最近对话', '最近對話', '最近の会話', '최근 대화', 'Conversaciones recientes', 'Conversations récentes', 'Letzte Unterhaltungen', 'Недавние диалоги', 'Conversas recentes'],
    ['All Conversations', '全部对话', '所有對話', 'すべての会話', '모든 대화', 'Todas las conversaciones', 'Toutes les conversations', 'Alle Unterhaltungen', 'Все диалоги', 'Todas as conversas'],
    ['History', '历史记录', '歷史紀錄', '履歴', '기록', 'Historial', 'Historique', 'Verlauf', 'История', 'Histórico'],
    ['Search conversations', '搜索对话', '搜尋對話', '会話を検索', '대화 검색', 'Buscar conversaciones', 'Rechercher des conversations', 'Unterhaltungen durchsuchen', 'Поиск диалогов', 'Pesquisar conversas'],
    ['Search conversations...', '搜索对话...', '搜尋對話...', '会話を検索...', '대화 검색...', 'Buscar conversaciones...', 'Rechercher des conversations...', 'Unterhaltungen durchsuchen...', 'Поиск диалогов...', 'Pesquisar conversas...'],
    ['Filter conversations', '筛选对话', '篩選對話', '会話を絞り込む', '대화 필터링', 'Filtrar conversaciones', 'Filtrer les conversations', 'Unterhaltungen filtern', 'Фильтр диалогов', 'Filtrar conversas'],
    ['Pin', '置顶', '釘選', 'ピン留め', '고정', 'Fijar', 'Épingler', 'Anheften', 'Закрепить', 'Fixar'],
    ['Unpin', '取消置顶', '取消釘選', 'ピン留め解除', '고정 해제', 'Desfijar', 'Désépingler', 'Lösen', 'Открепить', 'Desafixar'],
    ['Pin conversation', '置顶对话', '釘選對話', '会話をピン留め', '대화 고정', 'Fijar conversación', 'Épingler la conversation', 'Unterhaltung anheften', 'Закрепить диалог', 'Fixar conversa'],
    ['Unpin conversation', '取消置顶对话', '取消釘選對話', '会話のピン留めを解除', '대화 고정 해제', 'Desfijar conversación', 'Désépingler la conversation', 'Unterhaltung lösen', 'Открепить диалог', 'Desafixar conversa'],
    ['Pinned', '已置顶', '已釘選', 'ピン留め済み', '고정됨', 'Fijados', 'Épinglé', 'Angeheftet', 'Закреплено', 'Fixadas'],
    ['Rename', '重命名', '重新命名', '名前を変更', '이름 바꾸기', 'Renombrar', 'Renommer', 'Umbenennen', 'Переименовать', 'Renomear'],
    ['Rename conversation', '重命名对话', '重新命名對話', '会話の名前を変更', '대화 이름 바꾸기', 'Renombrar conversación', 'Renommer la conversation', 'Unterhaltung umbenennen', 'Переименовать диалог', 'Renomear conversa'],
    ['Archive', '归档', '封存', 'アーカイブ', '보관', 'Archivar', 'Archiver', 'Archivieren', 'Архивировать', 'Arquivar'],
    ['Unarchive', '取消归档', '取消封存', 'アーカイブ解除', '보관 해제', 'Desarchivar', 'Désarchiver', 'Aus Archiv holen', 'Разархивировать', 'Desarquivar'],
    ['Archived', '已归档', '已封存', 'アーカイブ済み', '보관됨', 'Archivado', 'Archivé', 'Archiviert', 'В архиве', 'Arquivado'],
    ['Delete', '删除', '刪除', '削除', '삭제', 'Eliminar', 'Supprimer', 'Löschen', 'Удалить', 'Excluir'],
    ['Delete conversation', '删除对话', '刪除對話', '会話を削除', '대화 삭제', 'Eliminar conversación', 'Supprimer la conversation', 'Unterhaltung löschen', 'Удалить диалог', 'Excluir conversa'],
    ['Star', '收藏', '加星號', 'スターを付ける', '즐겨찾기', 'Destacar', 'Favori', 'Markieren', 'В избранное', 'Favoritar'],
    ['Unstar', '取消收藏', '取消星號', 'スターを外す', '즐겨찾기 해제', 'Quitar estrella', 'Retirer des favoris', 'Markierung entfernen', 'Убрать из избранного', 'Desfavoritar'],
    ['Starred', '已收藏', '已加星號', 'スター付き', '즐겨찾기됨', 'Destacados', 'Favoris', 'Markiert', 'Избранное', 'Favoritos'],
    ['Favorites', '收藏夹', '我的最愛', 'お気に入り', '즐겨찾기 목록', 'Favoritos', 'Mes favoris', 'Favoriten', 'Избранные', 'Meus favoritos'],
    ['Workspace', '工作区', '工作區', 'ワークスペース', '작업 공간', 'Espacio de trabajo', 'Espace de travail', 'Arbeitsbereich', 'Рабочее пространство', 'Espaço de trabalho'],
    ['Workspaces', '工作区列表', '工作區列表', 'ワークスペース一覧', '작업 공간 목록', 'Espacios de trabajo', 'Espaces de travail', 'Arbeitsbereiche', 'Рабочие пространства', 'Espaços de trabalho'],
    ['Open Folder', '打开文件夹', '開啟資料夾', 'フォルダーを開く', '폴더 열기', 'Abrir carpeta', 'Ouvrir un dossier', 'Ordner öffnen', 'Открыть папку', 'Abrir pasta'],
    ['Open Workspace', '打开工作区', '開啟工作區', 'ワークスペースを開く', '작업 공간 열기', 'Abrir espacio de trabajo', 'Ouvrir un espace de travail', 'Arbeitsbereich öffnen', 'Открыть рабочее пространство', 'Abrir espaço de trabalho'],
    ['Add Workspace', '添加工作区', '新增工作區', 'ワークスペースを追加', '작업 공간 추가', 'Añadir espacio de trabajo', 'Ajouter un espace de travail', 'Arbeitsbereich hinzufügen', 'Добавить рабочее пространство', 'Adicionar espaço de trabalho'],
    ['Switch Workspace', '切换工作区', '切換工作區', 'ワークスペースを切り替え', '작업 공간 전환', 'Cambiar espacio de trabajo', 'Changer d’espace de travail', 'Arbeitsbereich wechseln', 'Сменить рабочее пространство', 'Trocar espaço de trabalho'],
    ['Close Workspace', '关闭工作区', '關閉工作區', 'ワークスペースを閉じる', '작업 공간 닫기', 'Cerrar espacio de trabajo', 'Fermer l’espace de travail', 'Arbeitsbereich schließen', 'Закрыть рабочее пространство', 'Fechar espaço de trabalho'],
    ['Recent Workspaces', '最近的工作区', '最近的工作區', '最近のワークスペース', '최근 작업 공간', 'Espacios recientes', 'Espaces récents', 'Zuletzt geöffnete Arbeitsbereiche', 'Недавние пространства', 'Espaços recentes'],
    ['Files', '文件', '檔案', 'ファイル', '파일', 'Archivos', 'Fichiers', 'Dateien', 'Файлы', 'Arquivos'],
    ['Explorer', '资源管理器', '檔案總管', 'エクスプローラー', '탐색기', 'Explorador', 'Explorateur', 'Datei-Explorer', 'Проводник', 'Explorador'],
    ['File Explorer', '文件浏览器', '檔案瀏覽器', 'ファイルエクスプローラー', '파일 탐색기', 'Explorador de archivos', 'Explorateur de fichiers', 'Dateibrowser', 'Файловый проводник', 'Explorador de arquivos'],
    ['Search Files', '搜索文件', '搜尋檔案', 'ファイルを検索', '파일 검색', 'Buscar archivos', 'Rechercher des fichiers', 'Dateien suchen', 'Поиск файлов', 'Pesquisar arquivos'],
    ['Terminal', '终端', '終端機', 'ターミナル', '터미널', 'Consola', 'Console', 'Konsole', 'Терминал', 'Console'],
    ['Open Terminal', '打开终端', '開啟終端機', 'ターミナルを開く', '터미널 열기', 'Abrir terminal', 'Ouvrir le terminal', 'Terminal öffnen', 'Открыть терминал', 'Abrir terminal'],
    ['New Terminal', '新建终端', '新增終端機', '新しいターミナル', '새 터미널', 'Nueva terminal', 'Nouveau terminal', 'Neues Terminal', 'Новый терминал', 'Novo terminal'],
    ['Browser', '浏览器', '瀏覽器', 'ブラウザ', '브라우저', 'Navegador', 'Navigateur', 'Webbrowser', 'Браузер', 'Navegador'],
    ['Artifacts', '产物', '產物', 'アーティファクト', '아티팩트', 'Artefactos', 'Artefacts', 'Artefakte', 'Артефакты', 'Artefatos'],
    ['Knowledge', '知识库', '知識庫', 'ナレッジ', '지식', 'Conocimiento', 'Connaissances', 'Wissen', 'База знаний', 'Conhecimento'],
    ['Knowledge Base', '知识库', '知識庫', 'ナレッジベース', '지식 베이스', 'Base de conocimientos', 'Base de connaissances', 'Wissensdatenbank', 'Хранилище знаний', 'Base de conhecimento'],
    ['Memory', '记忆', '記憶', 'メモリ', '메모리', 'Memoria', 'Mémoire', 'Speicher', 'Память', 'Memória'],
    ['Memories', '记忆库', '記憶庫', 'メモリ一覧', '기억 목록', 'Memorias', 'Mémoires', 'Erinnerungen', 'Воспоминания', 'Memórias'],
    ['Inbox', '收件箱', '收件匣', '受信トレイ', '받은 편지함', 'Bandeja de entrada', 'Boîte de réception', 'Posteingang', 'Входящие', 'Caixa de entrada'],
    ['Notifications', '通知', '通知', '通知', '알림', 'Notificaciones', 'Alertes', 'Benachrichtigungen', 'Уведомления', 'Notificações'],
    ['Settings', '设置', '設定', '設定', '설정', 'Configuración', 'Paramètres', 'Einstellungen', 'Настройки', 'Configurações'],
    ['Preferences', '偏好设置', '偏好設定', '環境設定', '환경설정', 'Preferencias', 'Préférences', 'Präferenzen', 'Предпочтения', 'Preferências'],
    ['Plugins', '插件', '外掛程式', 'プラグイン', '플러그인', 'Complementos', 'Greffons', 'Erweiterungs-Plugins', 'Плагины', 'Extensões'],
    ['Marketplace', '插件市场', '市集', 'マーケットプレイス', '마켓플레이스', 'Tienda', 'Boutique', 'Marktplatz', 'Магазин', 'Loja'],
    ['Extensions', '扩展', '擴充功能', '拡張機能', '확장 프로그램', 'Extensiones', 'Modules', 'Erweiterungen', 'Расширения', 'Complementos'],
    ['Skills', '技能', '技能', 'スキル', '스킬', 'Habilidades', 'Compétences', 'Fähigkeiten', 'Навыки', 'Habilidades'],
    ['Rules', '规则', '規則', 'ルール', '규칙', 'Reglas', 'Règles', 'Regeln', 'Правила', 'Regras'],
    ['Hooks', '钩子', '掛鉤', 'フック', '훅', 'Ganchos', 'Crochets', 'Ereignishooks', 'Хуки', 'Ganchos'],
    ['MCP Servers', 'MCP 服务器', 'MCP 伺服器', 'MCP サーバー', 'MCP 서버', 'Servidores MCP', 'Serveurs MCP', 'MCP-Server', 'Серверы MCP', 'Servidores MCP'],
    ['Workflows', '工作流', '工作流程', 'ワークフロー', '워크플로', 'Flujos de trabajo', 'Flux de travail', 'Arbeitsabläufe', 'Рабочие процессы', 'Fluxos de trabalho'],
    ['Automations', '自动化', '自動化', 'オートメーション', '자동화', 'Automatizaciones', 'Automatisations', 'Automatisierungen', 'Автоматизации', 'Automações'],
    ['Swarm', '蜂群协作', '蜂群協作', 'スウォーム', '스웜', 'Enjambre', 'Essaim', 'Schwarm', 'Рой агентов', 'Enxame'],
    ['Agents', '智能体', '代理程式', 'エージェント', '에이전트', 'Agentes', 'Agents IA', 'Agenten', 'Агенты', 'Agentes'],
    ['Subagents', '子智能体', '子代理程式', 'サブエージェント', '서브에이전트', 'Subagentes', 'Sous-agents', 'Unteragenten', 'Субагенты', 'Subagentes'],
    ['Sidebar', '侧边栏', '側邊欄', 'サイドバー', '사이드바', 'Barra lateral', 'Barre latérale', 'Seitenleiste', 'Боковая панель', 'Barra lateral'],
    ['Toggle Sidebar', '切换侧边栏', '切換側邊欄', 'サイドバーを切り替え', '사이드바 전환', 'Alternar barra lateral', 'Basculer la barre latérale', 'Seitenleiste umschalten', 'Переключить боковую панель', 'Alternar barra lateral'],
    ['Collapse Sidebar', '收起侧边栏', '收合側邊欄', 'サイドバーを折りたたむ', '사이드바 접기', 'Contraer barra lateral', 'Réduire la barre latérale', 'Seitenleiste einklappen', 'Свернуть боковую панель', 'Recolher barra lateral'],
    ['Expand Sidebar', '展开侧边栏', '展開側邊欄', 'サイドバーを展開', '사이드바 펼치기', 'Expandir barra lateral', 'Développer la barre latérale', 'Seitenleiste ausklappen', 'Развернуть боковую панель', 'Expandir barra lateral'],
    ['Activity', '活动', '活動', 'アクティビティ', '활동', 'Actividad', 'Activité', 'Aktivität', 'Активность', 'Atividade'],
    ['Tasks', '任务', '任務', 'タスク', '작업', 'Tareas', 'Tâches', 'Aufgaben', 'Задачи', 'Tarefas'],
    ['Task List', '任务列表', '任務清單', 'タスクリスト', '작업 목록', 'Lista de tareas', 'Liste des tâches', 'Aufgabenliste', 'Список задач', 'Lista de tarefas'],
    ['Source Control', '源代码管理', '原始碼控制', 'ソース管理', '소스 제어', 'Control de código fuente', 'Contrôle de source', 'Quellcodeverwaltung', 'Управление версиями', 'Controle do código-fonte'],
    ['Branches', '分支', '分支', 'ブランチ', '브랜치', 'Ramas', 'Branches Git', 'Zweige', 'Ветки', 'Ramificações'],
    ['Changes', '更改', '變更', '変更', '변경 사항', 'Cambios', 'Modifications', 'Änderungen', 'Изменения', 'Alterações'],
    ['Diff', '差异对比', '差異比對', '差分', '차이 비교', 'Diferencias', 'Différences', 'Vergleich', 'Сравнение', 'Diferenças'],
    ['Preview', '预览', '預覽', 'プレビュー', '미리보기', 'Vista previa', 'Aperçu', 'Vorschau', 'Предпросмотр', 'Pré-visualização'],
    ['Output', '输出', '輸出', '出力', '출력', 'Salida', 'Sortie', 'Ausgabe', 'Вывод', 'Saída'],
    ['Problems', '问题', '問題', '問題', '문제', 'Problemas', 'Problèmes', 'Probleme', 'Проблемы', 'Problemas'],
    ['Console', '控制台', '主控台', 'コンソール', '콘솔', 'Consola de salida', 'Console système', 'Systemkonsole', 'Консоль', 'Console de saída'],
    ['Debug', '调试', '偵錯', 'デバッグ', '디버그', 'Depurar', 'Déboguer', 'Debuggen', 'Отладка', 'Depurar'],
    ['Outline', '大纲', '大綱', 'アウトライン', '개요', 'Esquema', 'Plan', 'Gliederung', 'Структура', 'Estrutura'],
    ['Bookmarks', '书签', '書籤', 'ブックマーク', '북마크', 'Marcadores', 'Signets', 'Lesezeichen', 'Закладки', 'Favoritos salvos'],
    ['Documentation', '文档', '文件', 'ドキュメント', '문서', 'Documentación', 'Doc technique', 'Dokumentation', 'Документация', 'Documentação'],
    ['Help', '帮助', '說明', 'ヘルプ', '도움말', 'Ayuda', 'Aide', 'Hilfe', 'Справка', 'Ajuda'],
    ['Home', '首页', '首頁', 'ホーム', '홈', 'Inicio', 'Accueil', 'Startseite', 'Главная', 'Início'],
    ['Overview', '概览', '概覽', '概要', '개요 요약', 'Resumen general', 'Vue d’ensemble', 'Übersicht', 'Обзор', 'Visão geral'],
    ['Dashboard', '工作台', '儀表板', 'ダッシュボード', '대시보드', 'Panel', 'Tableau de bord', 'Übersichtsseite', 'Панель управления', 'Painel'],

    // ── 2. Chat, Composer, Reasoning & Approval Controls ─────────────────────
    ['Ask anything...', '随便问点什么...', '隨便問點什麼...', '何でも聞いてください...', '무엇이든 물어보세요...', 'Pregunta lo que quieras...', 'Demandez n’importe quoi...', 'Frag irgendetwas...', 'Спросите что угодно...', 'Pergunte qualquer coisa...'],
    ['Ask anything', '随便问点什么', '隨便問點什麼', '何でも質問', '무엇이든 질문', 'Pregunta lo que quieras', 'Demandez n’importe quoi', 'Frag irgendetwas', 'Спросите что угодно', 'Pergunte qualquer coisa'],
    ['Type a message...', '输入消息...', '輸入訊息...', 'メッセージを入力...', '메시지를 입력하세요...', 'Escribe un mensaje...', 'Saisissez un message...', 'Nachricht eingeben...', 'Введите сообщение...', 'Digite uma mensagem...'],
    ['Send a message...', '发送消息...', '傳送訊息...', 'メッセージを送信...', '메시지 보내기...', 'Envía un mensaje...', 'Envoyez un message...', 'Nachricht senden...', 'Отправьте сообщение...', 'Envie uma mensagem...'],
    ['Write a message...', '撰写消息...', '撰寫訊息...', 'メッセージを作成...', '메시지 작성...', 'Redacta un mensaje...', 'Écrivez un message...', 'Nachricht schreiben...', 'Напишите сообщение...', 'Escreva uma mensagem...'],
    ['Follow up...', '继续追问...', '繼續追問...', '続けて質問...', '추가 질문...', 'Continuar conversación...', 'Poser une question de suivi...', 'Nachfragen...', 'Уточнить...', 'Continuar conversa...'],
    ['Ask a follow-up...', '提出后续问题...', '提出後續問題...', '追加で質問する...', '후속 질문 입력...', 'Haz una pregunta adicional...', 'Posez une question complémentaire...', 'Rückfrage stellen...', 'Задайте уточняющий вопрос...', 'Faça uma pergunta complementar...'],
    ['Send', '发送', '傳送', '送信', '보내기', 'Enviar', 'Envoyer', 'Senden', 'Отправить', 'Enviar'],
    ['Send message', '发送消息', '傳送訊息', 'メッセージを送信', '메시지 보내기', 'Enviar mensaje', 'Envoyer le message', 'Nachricht senden', 'Отправить сообщение', 'Enviar mensagem'],
    ['Stop', '停止', '停止', '停止', '중지', 'Detener', 'Arrêter', 'Stoppen', 'Остановить', 'Parar'],
    ['Stop generating', '停止生成', '停止生成', '生成を停止', '생성 중지', 'Detener generación', 'Arrêter la génération', 'Generierung stoppen', 'Остановить генерацию', 'Parar geração'],
    ['Cancel', '取消', '取消', 'キャンセル', '취소', 'Cancelar', 'Annuler', 'Abbrechen', 'Отмена', 'Cancelar'],
    ['Retry', '重试', '重試', '再試行', '재시도', 'Reintentar', 'Réessayer', 'Erneut versuchen', 'Повторить', 'Tentar novamente'],
    ['Regenerate', '重新生成', '重新生成', '再生成', '다시 생성', 'Regenerar', 'Régénérer', 'Neu generieren', 'Сгенерировать заново', 'Regenerar'],
    ['Regenerate response', '重新生成回复', '重新生成回覆', '応答を再生成', '응답 다시 생성', 'Regenerar respuesta', 'Régénérer la réponse', 'Antwort neu generieren', 'Сгенерировать ответ заново', 'Regenerar resposta'],
    ['Edit', '编辑', '編輯', '編集', '편집', 'Editar', 'Modifier', 'Bearbeiten', 'Редактировать', 'Editar'],
    ['Edit message', '编辑消息', '編輯訊息', 'メッセージを編集', '메시지 편집', 'Editar mensaje', 'Modifier le message', 'Nachricht bearbeiten', 'Изменить сообщение', 'Editar mensagem'],
    ['Copy', '复制', '複製', 'コピー', '복사', 'Copiar', 'Copier', 'Kopieren', 'Копировать', 'Copiar'],
    ['Copy message', '复制消息', '複製訊息', 'メッセージをコピー', '메시지 복사', 'Copiar mensaje', 'Copier le message', 'Nachricht kopieren', 'Копировать сообщение', 'Copiar mensagem'],
    ['Undo', '撤销', '復原', '元に戻す', '실행 취소', 'Deshacer', 'Annuler l’action', 'Rückgängig', 'Отменить действие', 'Desfazer'],
    ['Redo', '重做', '重做', 'やり直す', '다시 실행', 'Rehacer', 'Rétablir', 'Wiederholen', 'Повторить действие', 'Refazer'],
    ['Revert', '回退', '還原', '元に戻す', '되돌리기', 'Revertir', 'Rétablir l’état', 'Zurücksetzen', 'Откатить', 'Reverter'],
    ['Revert changes', '撤销更改', '還原變更', '変更を元に戻す', '변경 사항 되돌리기', 'Revertir cambios', 'Annuler les modifications', 'Änderungen rückgängig machen', 'Откатить изменения', 'Reverter alterações'],
    ['Compact', '压缩', '壓縮', '圧縮', '압축', 'Compactar', 'Compacter', 'Komprimieren', 'Сжать', 'Compactar'],
    ['Compact conversation', '压缩对话', '壓縮對話', '会話を圧縮', '대화 압축', 'Compactar conversación', 'Compacter la conversation', 'Unterhaltung komprimieren', 'Сжать диалог', 'Compactar conversa'],
    ['Clear', '清空', '清除', 'クリア', '지우기', 'Limpiar', 'Effacer', 'Leeren', 'Очистить', 'Limpar'],
    ['Clear conversation', '清空对话', '清除對話', '会話をクリア', '대화 지우기', 'Limpiar conversación', 'Effacer la conversation', 'Unterhaltung leeren', 'Очистить диалог', 'Limpar conversa'],
    ['Clear chat', '清空聊天', '清除聊天', 'チャットをクリア', '채팅 지우기', 'Limpiar chat', 'Effacer le chat', 'Chat leeren', 'Очистить чат', 'Limpar chat'],
    ['Clear history', '清除历史记录', '清除歷史紀錄', '履歴をクリア', '기록 지우기', 'Borrar historial', 'Effacer l’historique', 'Verlauf löschen', 'Очистить историю', 'Limpar histórico'],
    ['Attach', '附加', '附加', '添付', '첨부', 'Adjuntar', 'Joindre', 'Anhängen', 'Прикрепить', 'Anexar'],
    ['Attach file', '附加文件', '附加檔案', 'ファイルを添付', '파일 첨부', 'Adjuntar archivo', 'Joindre un fichier', 'Datei anhängen', 'Прикрепить файл', 'Anexar arquivo'],
    ['Upload image', '上传图片', '上傳圖片', '画像をアップロード', '이미지 업로드', 'Subir imagen', 'Importer une image', 'Bild hochladen', 'Загрузить изображение', 'Enviar imagem'],
    ['Upload file', '上传文件', '上傳檔案', 'ファイルをアップロード', '파일 업로드', 'Subir archivo', 'Importer un fichier', 'Datei hochladen', 'Загрузить файл', 'Enviar arquivo'],
    ['Add context', '添加上下文', '新增上下文', 'コンテキストを追加', '컨텍스트 추가', 'Añadir contexto', 'Ajouter du contexte', 'Kontext hinzufügen', 'Добавить контекст', 'Adicionar contexto'],
    ['Mention file', '提及文件', '提及檔案', 'ファイルを参照', '파일 멘션', 'Mencionar archivo', 'Mentionner un fichier', 'Datei erwähnen', 'Упомянуть файл', 'Mencionar arquivo'],
    ['Add files', '添加文件', '新增檔案', 'ファイルを追加', '파일 추가', 'Añadir archivos', 'Ajouter des fichiers', 'Dateien hinzufügen', 'Добавить файлы', 'Adicionar arquivos'],
    ['Select files', '选择文件', '選擇檔案', 'ファイルを選択', '파일 선택', 'Seleccionar archivos', 'Sélectionner des fichiers', 'Dateien auswählen', 'Выбрать файлы', 'Selecionar arquivos'],
    ['Model', '模型', '模型', 'モデル', '모델', 'Modelo', 'Modèle', 'Modell', 'Модель', 'Modelo'],
    ['Models', '模型列表', '模型列表', 'モデル一覧', '모델 목록', 'Modelos', 'Modèles', 'Modelle', 'Модели', 'Modelos'],
    ['Select model', '选择模型', '選擇模型', 'モデルを選択', '모델 선택', 'Seleccionar modelo', 'Choisir un modèle', 'Modell auswählen', 'Выбрать модель', 'Selecionar modelo'],
    ['Reasoning', '推理', '推理', '推論', '추론', 'Razonamiento', 'Raisonnement', 'Schlussfolgern', 'Рассуждение', 'Raciocínio'],
    ['Reasoning effort', '推理强度', '推理強度', '推論の深さ', '추론 강도', 'Nivel de razonamiento', 'Effort de raisonnement', 'Denktiefe', 'Глубина рассуждения', 'Nível de raciocínio'],
    ['Effort', '思考深度', '思考深度', '推論レベル', '추론 수준', 'Esfuerzo', 'Intensité', 'Aufwand', 'Усилие', 'Esforço'],
    ['Fast', '快速', '快速', '高速', '빠름', 'Rápido', 'Rapide', 'Schnell', 'Быстрый', 'Rápido'],
    ['Balanced', '均衡', '均衡', 'バランス', '균형', 'Equilibrado', 'Équilibré', 'Ausgewogen', 'Сбалансированный', 'Equilibrado'],
    ['Deep', '深度', '深度', '深い推論', '깊음', 'Profundo', 'Approfondi', 'Tiefgehend', 'Глубокий', 'Profundo'],
    ['High', '高', '高', '高', '높음', 'Alto', 'Élevé', 'Hoch', 'Высокий', 'Alto'],
    ['Medium', '中', '中', '中', '중간', 'Medio', 'Moyen', 'Mittel', 'Средний', 'Médio'],
    ['Low', '低', '低', '低', '낮음', 'Bajo', 'Faible', 'Niedrig', 'Низкий', 'Baixo'],
    ['Auto', '自动', '自動', '自動', '자동', 'Automático', 'Automatique', 'Automatisch', 'Авто', 'Automático'],
    ['Planning', '规划中', '規劃中', '計画中', '계획 중', 'Planificación', 'Planification', 'Planung', 'Планирование', 'Planejamento'],
    ['Execution', '执行中', '執行中', '実行', '실행', 'Ejecución', 'Exécution', 'Ausführung', 'Выполнение', 'Execução'],
    ['Verification', '验证中', '驗證中', '検証', '검증', 'Verificación', 'Vérification', 'Überprüfung', 'Проверка', 'Verificação'],
    ['Thought', '思考', '思考', '思考', '사고', 'Pensamiento', 'Réflexion', 'Gedanke', 'Мысль', 'Pensamento'],
    ['Thinking', '正在思考', '正在思考', '思考中', '생각 중', 'Pensando', 'Réflexion en cours', 'Denkt nach', 'Размышление', 'Pensando'],
    ['Thinking...', '正在思考...', '正在思考...', '思考中...', '생각 중...', 'Pensando...', 'Réflexion en cours...', 'Denkt nach...', 'Размышляю...', 'Pensando...'],
    ['Thought process', '思考过程', '思考過程', '思考プロセス', '사고 과정', 'Proceso de pensamiento', 'Processus de réflexion', 'Denkprozess', 'Ход рассуждений', 'Processo de pensamento'],
    ['Show details', '显示详情', '顯示詳情', '詳細を表示', '세부 정보 표시', 'Mostrar detalles', 'Afficher les détails', 'Details anzeigen', 'Показать подробности', 'Mostrar detalhes'],
    ['Hide details', '隐藏详情', '隱藏詳情', '詳細を非表示', '세부 정보 숨기기', 'Ocultar detalles', 'Masquer les détails', 'Details ausblenden', 'Скрыть подробности', 'Ocultar detalhes'],
    ['Show more', '显示更多', '顯示更多', 'さらに表示', '더 보기', 'Mostrar más', 'Afficher plus', 'Mehr anzeigen', 'Показать больше', 'Mostrar mais'],
    ['Show less', '收起', '顯示較少', '折りたたむ', '간략히 보기', 'Mostrar menos', 'Afficher moins', 'Weniger anzeigen', 'Свернуть', 'Mostrar menos'],
    ['View details', '查看详情', '檢視詳情', '詳細を見る', '상세 보기', 'Ver detalles', 'Voir les détails', 'Details ansehen', 'Просмотреть детали', 'Ver detalhes'],
    ['Expand', '展开', '展開', '展開', '펼치기', 'Expandir', 'Développer', 'Aufklappen', 'Развернуть', 'Expandir'],
    ['Collapse', '折叠', '收合', '折りたたむ', '접기', 'Contraer', 'Réduire', 'Zuklappen', 'Свернуть', 'Recolher'],
    ['Expand all', '全部展开', '全部展開', 'すべて展開', '모두 펼치기', 'Expandir todo', 'Tout développer', 'Alle aufklappen', 'Развернуть все', 'Expandir tudo'],
    ['Collapse all', '全部折叠', '全部收合', 'すべて折りたたむ', '모두 접기', 'Contraer todo', 'Tout réduire', 'Alle zuklappen', 'Свернуть все', 'Recolher tudo'],
    ['Copy code', '复制代码', '複製程式碼', 'コードをコピー', '코드 복사', 'Copiar código', 'Copier le code', 'Code kopieren', 'Копировать код', 'Copiar código'],
    ['Apply', '应用', '套用', '適用', '적용', 'Aplicar', 'Appliquer', 'Anwenden', 'Применить', 'Aplicar'],
    ['Apply changes', '应用更改', '套用變更', '変更を適用', '변경 사항 적용', 'Aplicar cambios', 'Appliquer les modifications', 'Änderungen anwenden', 'Применить изменения', 'Aplicar alterações'],
    ['Accept', '接受', '接受', '承認', '수락', 'Aceptar', 'Accepter', 'Akzeptieren', 'Принять', 'Aceitar'],
    ['Reject', '拒绝', '拒絕', '拒否', '거부', 'Rechazar', 'Refuser', 'Ablehnen', 'Отклонить', 'Rejeitar'],
    ['Accept all', '全部接受', '全部接受', 'すべて承認', '모두 수락', 'Aceptar todo', 'Tout accepter', 'Alle akzeptieren', 'Принять все', 'Aceitar tudo'],
    ['Reject all', '全部拒绝', '全部拒絕', 'すべて拒否', '모두 거부', 'Rechazar todo', 'Tout refuser', 'Alle ablehnen', 'Отклонить все', 'Rejeitar tudo'],
    ['Keep', '保留', '保留', '保持', '유지', 'Mantener', 'Conserver', 'Behalten', 'Оставить', 'Manter'],
    ['Discard', '放弃', '捨棄', '破棄', '버리기', 'Descartar', 'Ignorer', 'Verwerfen', 'Отбросить', 'Descartar'],
    ['Run', '运行', '執行', '実行', '실행', 'Ejecutar', 'Exécuter', 'Ausführen', 'Запустить', 'Executar'],
    ['Run command', '运行命令', '執行指令', 'コマンドを実行', '명령 실행', 'Ejecutar comando', 'Exécuter la commande', 'Befehl ausführen', 'Выполнить команду', 'Executar comando'],
    ['Run in terminal', '在终端中运行', '在終端機中執行', 'ターミナルで実行', '터미널에서 실행', 'Ejecutar en terminal', 'Exécuter dans le terminal', 'Im Terminal ausführen', 'Запустить в терминале', 'Executar no terminal'],
    ['Allow', '允许', '允許', '許可', '허용', 'Permitir', 'Autoriser', 'Erlauben', 'Разрешить', 'Permitir'],
    ['Allow once', '仅本次允许', '僅本次允許', '今回のみ許可', '한 번만 허용', 'Permitir una vez', 'Autoriser une fois', 'Einmal erlauben', 'Разрешить один раз', 'Permitir uma vez'],
    ['Always allow', '始终允许', '一律允許', '常に許可', '항상 허용', 'Permitir siempre', 'Toujours autoriser', 'Immer erlauben', 'Всегда разрешать', 'Sempre permitir'],
    ['Allow for this session', '本会话内允许', '本會話內允許', 'このセッションで許可', '이 세션에서 허용', 'Permitir en esta sesión', 'Autoriser pour cette session', 'Für diese Sitzung erlauben', 'Разрешить в этом сеансе', 'Permitir nesta sessão'],
    ['Allow for this workspace', '本工作区内允许', '本工作區內允許', 'このワークスペースで許可', '이 작업 공간에서 허용', 'Permitir en este espacio', 'Autoriser pour cet espace', 'Für diesen Arbeitsbereich erlauben', 'Разрешить в этом пространстве', 'Permitir neste espaço'],
    ['Deny', '拒绝', '拒絕', '拒否', '거부', 'Denegar', 'Refuser l’accès', 'Verweigern', 'Запретить', 'Negar'],
    ['Proceed', '继续执行', '繼續執行', '続行する', '진행', 'Proceder', 'Poursuivre', 'Fortfahren', 'Продолжить', 'Prosseguir'],
    ['Continue', '继续', '繼續', '続ける', '계속', 'Continuar', 'Continuer', 'Weiter', 'Продолжить', 'Continuar'],
    ['Approve', '批准', '核准', '承認する', '승인', 'Aprobar', 'Approuver', 'Genehmigen', 'Одобрить', 'Aprovar'],
    ['Reject action', '拒绝操作', '拒絕操作', '操作を拒否', '작업 거부', 'Rechazar acción', 'Refuser l’action', 'Aktion ablehnen', 'Отклонить действие', 'Rejeitar ação'],
    ['Waiting for approval', '等待批准', '等待核准', '承認待ち', '승인 대기 중', 'Esperando aprobación', 'En attente d’approbation', 'Wartet auf Genehmigung', 'Ожидание одобрения', 'Aguardando aprovação'],
    ['Waiting for input', '等待输入', '等待輸入', '入力待ち', '입력 대기 중', 'Esperando entrada', 'En attente de saisie', 'Wartet auf Eingabe', 'Ожидание ввода', 'Aguardando entrada'],
    ['Permission required', '需要权限', '需要權限', '権限が必要です', '권한 필요', 'Permiso requerido', 'Autorisation requise', 'Berechtigung erforderlich', 'Требуется разрешение', 'Permissão necessária'],
    ['Review changes', '审查更改', '審查變更', '変更を確認', '변경 사항 검토', 'Revisar cambios', 'Examiner les modifications', 'Änderungen prüfen', 'Проверить изменения', 'Revisar alterações'],
    ['Generating...', '正在生成...', '正在生成...', '生成中...', '생성 중...', 'Generando...', 'Génération en cours...', 'Wird generiert...', 'Генерация...', 'Gerando...'],
    ['Running...', '运行中...', '執行中...', '実行中...', '실행 중...', 'Ejecutando...', 'Exécution en cours...', 'Wird ausgeführt...', 'Выполняется...', 'Executando...'],
    ['Loading...', '加载中...', '載入中...', '読み込み中...', '불러오는 중...', 'Cargando...', 'Chargement...', 'Wird geladen...', 'Загрузка...', 'Carregando...'],
    ['Analyzing...', '正在分析...', '正在分析...', '分析中...', '분석 중...', 'Analizando...', 'Analyse en cours...', 'Wird analysiert...', 'Анализ...', 'Analisando...'],
    ['Searching...', '正在搜索...', '正在搜尋...', '検索中...', '검색 중...', 'Buscando...', 'Recherche en cours...', 'Wird gesucht...', 'Поиск...', 'Pesquisando...'],
    ['Reading...', '正在读取...', '正在讀取...', '読み込み中...', '읽는 중...', 'Leyendo...', 'Lecture en cours...', 'Wird gelesen...', 'Чтение...', 'Lendo...'],
    ['Writing...', '正在写入...', '正在寫入...', '書き込み中...', '쓰는 중...', 'Escribiendo...', 'Écriture en cours...', 'Wird geschrieben...', 'Запись...', 'Escrevendo...'],
    ['Editing...', '正在编辑...', '正在編輯...', '編集中...', '편집 중...', 'Editando...', 'Modification en cours...', 'Wird bearbeitet...', 'Редактирование...', 'Editando...'],
    ['Executing...', '正在执行...', '正在執行...', '実行中...', '수행 중...', 'Ejecutando comando...', 'Traitement en cours...', 'Ausführung läuft...', 'Выполнение...', 'Em execução...'],
    ['Completed', '已完成', '已完成', '完了', '완료됨', 'Completado', 'Terminé', 'Abgeschlossen', 'Завершено', 'Concluído'],
    ['Failed', '失败', '失敗', '失敗', '실패', 'Fallido', 'Échec', 'Fehlgeschlagen', 'Ошибка выполнения', 'Falhou'],
    ['Cancelled', '已取消', '已取消', 'キャンセル済み', '취소됨', 'Cancelado', 'Annulé', 'Abgebrochen', 'Отменено', 'Cancelado'],
    ['Canceled', '已取消', '已取消', 'キャンセル済み', '취소됨', 'Cancelado', 'Annulé', 'Abgebrochen', 'Отменено', 'Cancelado'],
    ['Stalled', '已停滞', '已停滯', '停滞中', '정체됨', 'Estancado', 'Bloqué', 'Festgefahren', 'Зависло', 'Travado'],
    ['Queued', '排队中', '排隊中', '待機中', '대기열에 있음', 'En cola', 'En file d’attente', 'In Warteschlange', 'В очереди', 'Na fila'],
    ['In progress', '进行中', '進行中', '進行中', '진행 중', 'En progreso', 'En cours', 'In Bearbeitung', 'В процессе', 'Em andamento'],
    ['Idle', '空闲', '閒置', '待機中', '유휴', 'Inactivo', 'Inactif', 'Leerlauf', 'Ожидание', 'Ocioso'],
    ['Paused', '已暂停', '已暫停', '一時停止', '일시 중지됨', 'En pausa', 'En pause', 'Pausiert', 'Приостановлено', 'Pausado'],
    ['Stopped', '已停止', '已停止', '停止済み', '중지됨', 'Detenido', 'Arrêté', 'Gestoppt', 'Остановлено', 'Parado'],
    ['Timeout', '超时', '逾時', 'タイムアウト', '시간 초과', 'Tiempo agotado', 'Délai dépassé', 'Zeitüberschreitung', 'Тайм-аут', 'Tempo esgotado'],
    ['Timed out', '已超时', '已逾時', 'タイムアウトしました', '시간이 초과됨', 'Tiempo de espera agotado', 'Délai expiré', 'Zeit abgelaufen', 'Время истекло', 'Tempo limite atingido'],
    ['Context', '上下文', '上下文', 'コンテキスト', '컨텍스트', 'Contexto', 'Contexte', 'Kontext', 'Контекст', 'Contexto'],
    ['Context window', '上下文窗口', '上下文視窗', 'コンテキストウィンドウ', '컨텍스트 창', 'Ventana de contexto', 'Fenêtre de contexte', 'Kontextfenster', 'Окно контекста', 'Janela de contexto'],
    ['Context usage', '上下文占用', '上下文使用量', 'コンテキスト使用量', '컨텍스트 사용량', 'Uso de contexto', 'Utilisation du contexte', 'Kontextverbrauch', 'Использование контекста', 'Uso de contexto'],
    ['No messages yet', '暂无消息', '尚無訊息', 'メッセージはまだありません', '아직 메시지가 없습니다', 'Aún no hay mensajes', 'Aucun message pour le moment', 'Noch keine Nachrichten', 'Сообщений пока нет', 'Ainda não há mensagens'],
    ['Start a new conversation', '开启新对话', '開始新對話', '新しい会話を始める', '새 대화 시작하기', 'Inicia una nueva conversación', 'Démarrer une nouvelle conversation', 'Neue Unterhaltung starten', 'Начните новый диалог', 'Iniciar uma nova conversa'],
    ['Drop files here', '拖放文件到此处', '拖放檔案至此處', 'ここにファイルをドロップ', '여기에 파일 놓기', 'Suelta archivos aquí', 'Déposez des fichiers ici', 'Dateien hier ablegen', 'Перетащите файлы сюда', 'Solte os arquivos aqui'],
    ['Voice input', '语音输入', '語音輸入', '音声入力', '음성 입력', 'Entrada de voz', 'Saisie vocale', 'Spracheingabe', 'Голосовой ввод', 'Entrada de voz'],
    ['Mode', '模式', '模式', 'モード', '모드', 'Modo', 'Mode de travail', 'Modus', 'Режим', 'Modo'],
    ['Plan', '规划', '規劃', '計画', '계획', 'Planificar', 'Planifier', 'Planen', 'План', 'Planejar'],
    ['Agent', '智能体模式', '代理模式', 'エージェント', '에이전트', 'Agente', 'Agent IA', 'KI-Agent', 'Агент', 'Agente'],
    ['Ask', '问答', '提問', '質問', '질문', 'Preguntar', 'Demander', 'Fragen', 'Спросить', 'Perguntar'],
    ['Code', '代码', '程式碼', 'コード', '코드', 'Código', 'Code source', 'Quellcode', 'Код', 'Código'],
    ['Review', '审查', '審查', 'レビュー', '검토', 'Revisar', 'Révision', 'Überprüfen', 'Ревью', 'Revisão'],
    ['Share', '分享', '分享', '共有', '공유', 'Compartir', 'Partager', 'Teilen', 'Поделиться', 'Compartilhar'],
    ['Branch conversation', '分支对话', '分支對話', '会話を分岐', '대화 분기', 'Bifurcar conversación', 'Créer une branche', 'Unterhaltung verzweigen', 'Ответвить диалог', 'Ramificar conversa'],
    ['Fork conversation', '派生对话', '衍生對話', '会話をフォーク', '대화 복제 분기', 'Clonar conversación', 'Dupliquer la branche', 'Unterhaltung abspalten', 'Форкнуть диалог', 'Bifurcar conversa'],
    ['Jump to bottom', '跳到底部', '跳至底部', '最下部へ移動', '맨 아래로 이동', 'Ir al final', 'Aller en bas', 'Nach unten springen', 'Перейти вниз', 'Ir para o final'],
    ['Scroll to bottom', '滚动到底部', '捲動至底部', '下にスクロール', '아래로 스크롤', 'Desplazar al final', 'Faire défiler vers le bas', 'Nach unten scrollen', 'Прокрутить вниз', 'Rolar para o final'],
    ['Scroll to top', '滚动到顶部', '捲動至頂部', '上にスクロール', '위로 스크롤', 'Desplazar al inicio', 'Faire défiler vers le haut', 'Nach oben scrollen', 'Прокрутить вверх', 'Rolar para o topo'],

    // ── 3. Settings Pages ────────────────────────────────────────────────────
    ['General', '常规', '一般', '一般', '일반', 'Ajustes generales', 'Général', 'Allgemein', 'Общие', 'Geral'],
    ['Appearance', '外观', '外觀', '外観', '모양', 'Apariencia', 'Apparence', 'Darstellung', 'Внешний вид', 'Aparência'],
    ['Theme', '主题', '佈景主題', 'テーマ', '테마', 'Tema', 'Thème', 'Design', 'Тема', 'Tema'],
    ['Color Theme', '配色主题', '色彩主題', 'カラーテーマ', '색상 테마', 'Tema de color', 'Thème de couleur', 'Farbdesign', 'Цветовая тема', 'Tema de cores'],
    ['Dark', '深色', '深色', 'ダーク', '다크', 'Oscuro', 'Sombre', 'Dunkel', 'Тёмная', 'Escuro'],
    ['Light', '浅色', '淺色', 'ライト', '라이트', 'Claro', 'Clair', 'Hell', 'Светлая', 'Claro'],
    ['System', '跟随系统', '跟隨系統', 'システム', '시스템', 'Sistema', 'Système', 'Systemstandard', 'Системная', 'Sistema'],
    ['Follow system', '跟随系统设置', '跟隨系統設定', 'システム設定に従う', '시스템 설정 따르기', 'Seguir al sistema', 'Suivre le système', 'Systemeinstellung folgen', 'Как в системе', 'Seguir o sistema'],
    ['Display Language', '显示语言', '顯示語言', '表示言語', '표시 언어', 'Idioma de visualización', 'Langue d’affichage', 'Anzeigesprache', 'Язык интерфейса', 'Idioma de exibição'],
    ['Language', '语言', '語言', '言語', '언어', 'Idioma', 'Langue', 'Sprache', 'Язык', 'Idioma'],
    ['Interface Language', '界面语言', '介面語言', 'インターフェース言語', '인터페이스 언어', 'Idioma de la interfaz', 'Langue de l’interface', 'Oberflächensprache', 'Язык оболочки', 'Idioma da interface'],
    ['Font Size', '字体大小', '字型大小', 'フォントサイズ', '글꼴 크기', 'Tamaño de fuente', 'Taille de police', 'Schriftgröße', 'Размер шрифта', 'Tamanho da fonte'],
    ['Font Family', '字体族', '字型家族', 'フォントファミリー', '글꼴 패밀리', 'Familia tipográfica', 'Police de caractères', 'Schriftart', 'Семейство шрифтов', 'Família da fonte'],
    ['Editor', '编辑器', '編輯器', 'エディター', '편집기', 'Editor de código', 'Éditeur', 'Code-Editor', 'Редактор', 'Editor de código'],
    ['Code Editor', '代码编辑器', '程式碼編輯器', 'コードエディター', '코드 편집기', 'Editor de texto', 'Éditeur de code', 'Quelltext-Editor', 'Редактор кода', 'Editor de texto'],
    ['Line Wrap', '自动换行', '自動換行', '行の折り返し', '줄 바꿈', 'Ajuste de línea', 'Retour à la ligne', 'Zeilenumbruch', 'Перенос строк', 'Quebra de linha'],
    ['Word Wrap', '自动换行', '自動換行', '単語の折り返し', '자동 줄 바꿈', 'Ajuste de texto', 'Retour automatique à la ligne', 'Wortumbruch', 'Перенос по словам', 'Quebra automática'],
    ['Line Numbers', '行号', '行號', '行番号', '줄 번호', 'Números de línea', 'Numéros de ligne', 'Zeilennummern', 'Номера строк', 'Números de linha'],
    ['Models & Quotas', '模型与配额', '模型與配額', 'モデルとクォータ', '모델 및 할당량', 'Modelos y cuotas', 'Modèles et quotas', 'Modelle & Kontingente', 'Модели и квоты', 'Modelos e cotas'],
    ['Quotas', '配额', '配額', 'クォータ', '할당량', 'Cuotas', 'Quotas d’utilisation', 'Kontingente', 'Квоты', 'Cotas'],
    ['Account', '账号', '帳戶', 'アカウント', '계정', 'Cuenta', 'Compte', 'Konto', 'Аккаунт', 'Conta'],
    ['Profile', '个人资料', '個人檔案', 'プロフィール', '프로필', 'Perfil', 'Profil', 'Profil', 'Профиль', 'Perfil'],
    ['Sign in', '登录', '登入', 'サインイン', '로그인', 'Iniciar sesión', 'Se connecter', 'Anmelden', 'Войти', 'Entrar'],
    ['Sign out', '退出登录', '登出', 'サインアウト', '로그아웃', 'Cerrar sesión', 'Se déconnecter', 'Abmelden', 'Выйти', 'Sair'],
    ['Log in', '登录', '登入', 'ログイン', '로그인', 'Acceder', 'Connexion', 'Einloggen', 'Вход', 'Fazer login'],
    ['Log out', '退出登录', '登出', 'ログアウト', '로그아웃', 'Salir', 'Déconnexion', 'Ausloggen', 'Выход', 'Fazer logout'],
    ['Switch Account', '切换账号', '切換帳戶', 'アカウントを切り替え', '계정 전환', 'Cambiar de cuenta', 'Changer de compte', 'Konto wechseln', 'Сменить аккаунт', 'Trocar de conta'],
    ['Manage Account', '管理账号', '管理帳戶', 'アカウントを管理', '계정 관리', 'Administrar cuenta', 'Gérer le compte', 'Konto verwalten', 'Управление аккаунтом', 'Gerenciar conta'],
    ['Billing', '账单', '帳單', '請求', '결제', 'Facturación', 'Facturation', 'Abrechnung', 'Оплата', 'Faturamento'],
    ['Subscription', '订阅', '訂閱', 'サブスクリプション', '구독', 'Suscripción', 'Abonnement', 'Abonnement', 'Подписка', 'Assinatura'],
    ['Plan & Billing', '套餐与账单', '方案與帳單', 'プランと請求', '요금제 및 결제', 'Plan y facturación', 'Forfait et facturation', 'Tarif & Abrechnung', 'Тариф и оплата', 'Plano e faturamento'],
    ['Upgrade', '升级', '升級', 'アップグレード', '업그레이드', 'Mejorar plan', 'Mettre à niveau', 'Upgraden', 'Улучшить тариф', 'Fazer upgrade'],
    ['Usage', '用量', '使用量', '使用量', '사용량', 'Uso', 'Utilisation', 'Nutzung', 'Использование', 'Uso'],
    ['Usage & Limits', '用量与限额', '使用量與限額', '使用量と上限', '사용량 및 한도', 'Uso y límites', 'Utilisation et limites', 'Nutzung & Limits', 'Использование и лимиты', 'Uso e limites'],
    ['Quota', '配额', '配額', '利用枠', '할당량', 'Cuota', 'Quota', 'Kontingent', 'Квота', 'Cota'],
    ['Rate limit', '速率限制', '速率限制', 'レート制限', '속도 제한', 'Límite de frecuencia', 'Limite de débit', 'Ratenlimit', 'Ограничение частоты', 'Limite de taxa'],
    ['Shortcuts', '快捷键', '快速鍵', 'ショートカット', '단축키', 'Atajos', 'Raccourcis', 'Tastenkürzel', 'Горячие клавиши', 'Atalhos'],
    ['Keyboard Shortcuts', '键盘快捷键', '鍵盤快速鍵', 'キーボードショートカット', '키보드 단축키', 'Atajos de teclado', 'Raccourcis clavier', 'Tastenkombinationen', 'Сочетания клавиш', 'Atalhos de teclado'],
    ['Keybindings', '快捷键绑定', '按鍵繫結', 'キーバインド', '키 바인딩', 'Combinaciones de teclas', 'Assignation des touches', 'Tastenbelegung', 'Привязки клавиш', 'Mapeamento de teclas'],
    ['Privacy', '隐私', '隱私權', 'プライバシー', '개인정보 보호', 'Privacidad', 'Confidentialité', 'Datenschutz', 'Конфиденциальность', 'Privacidade'],
    ['Security', '安全', '安全性', 'セキュリティ', '보안', 'Seguridad', 'Sécurité', 'Sicherheit', 'Безопасность', 'Segurança'],
    ['Permissions', '权限', '權限', '権限', '권한', 'Permisos', 'Autorisations', 'Berechtigungen', 'Разрешения', 'Permissões'],
    ['Telemetry', '遥测', '遙測', 'テレメトリ', '원격 분석', 'Telemetría', 'Télémétrie', 'Telemetrie', 'Телеметрия', 'Telemetria'],
    ['Usage statistics', '使用统计', '使用統計資料', '使用統計', '사용 통계', 'Estadísticas de uso', 'Statistiques d’utilisation', 'Nutzungsstatistiken', 'Статистика использования', 'Estatísticas de uso'],
    ['Crash reports', '崩溃报告', '當機報告', 'クラッシュレポート', '충돌 보고서', 'Informes de fallos', 'Rapports de plantage', 'Absturzberichte', 'Отчёты о сбоях', 'Relatórios de erro'],
    ['Sound', '声音', '音效', 'サウンド', '소리', 'Sonido', 'Son', 'Ton', 'Звук', 'Som'],
    ['Sound effects', '音效', '聲音效果', '効果音', '효과음', 'Efectos de sonido', 'Effets sonores', 'Soundeffekte', 'Звуковые эффекты', 'Efeitos sonoros'],
    ['Desktop notifications', '桌面通知', '桌面通知', 'デスクトップ通知', '데스크톱 알림', 'Notificaciones de escritorio', 'Notifications de bureau', 'Desktop-Benachrichtigungen', 'Уведомления на рабочем столе', 'Notificações da área de trabalho'],
    ['Notification settings', '通知设置', '通知設定', '通知設定', '알림 설정', 'Ajustes de notificaciones', 'Paramètres de notification', 'Benachrichtigungseinstellungen', 'Настройки уведомлений', 'Configurações de notificação'],
    ['Proxy', '代理', '代理伺服器', 'プロキシ', '프록시', 'Servidor proxy', 'Serveur proxy', 'Proxy-Server', 'Прокси', 'Servidor proxy'],
    ['Network', '网络', '網路', 'ネットワーク', '네트워크', 'Red', 'Réseau', 'Netzwerk', 'Сеть', 'Rede'],
    ['HTTP Proxy', 'HTTP 代理', 'HTTP 代理伺服器', 'HTTP プロキシ', 'HTTP 프록시', 'Proxy HTTP', 'Proxy HTTP', 'HTTP-Proxy', 'HTTP-прокси', 'Proxy HTTP'],
    ['Connection', '连接', '連線', '接続', '연결', 'Conexión', 'Connexion réseau', 'Verbindung', 'Подключение', 'Conexão'],
    ['Offline', '离线', '離線', 'オフライン', '오프라인', 'Sin conexión', 'Hors ligne', 'Getrennt', 'Не в сети', 'Desconectado'],
    ['Online', '在线', '線上', 'オンライン', '온라인', 'En línea', 'En ligne', 'Verbunden', 'В сети', 'Conectado'],
    ['Connected', '已连接', '已連線', '接続済み', '연결됨', 'Conectado', 'Connecté', 'Verbunden', 'Подключено', 'Conectado'],
    ['Disconnected', '已断开连接', '已中斷連線', '切断済み', '연결 끊김', 'Desconectado', 'Déconnecté', 'Verbindung getrennt', 'Отключено', 'Desconectado'],
    ['Reconnecting...', '正在重新连接...', '正在重新連線...', '再接続中...', '다시 연결 중...', 'Reconectando...', 'Reconnexion...', 'Verbindung wird wiederhergestellt...', 'Переподключение...', 'Reconectando...'],
    ['Updates', '更新', '更新', 'アップデート', '업데이트', 'Actualizaciones', 'Mises à jour', 'Aktualisierungen', 'Обновления', 'Atualizações'],
    ['Check for updates', '检查更新', '檢查更新', 'アップデートを確認', '업데이트 확인', 'Buscar actualizaciones', 'Rechercher des mises à jour', 'Nach Updates suchen', 'Проверить обновления', 'Verificar atualizações'],
    ['Checking for updates...', '正在检查更新...', '正在檢查更新...', 'アップデートを確認中...', '업데이트 확인 중...', 'Buscando actualizaciones...', 'Recherche de mises à jour...', 'Suche nach Updates...', 'Проверка обновлений...', 'Verificando atualizações...'],
    ['Up to date', '已是最新版本', '已是最新版本', '最新です', '최신 상태입니다', 'Actualizado', 'À jour', 'Auf dem neuesten Stand', 'Установлена последняя версия', 'Atualizado'],
    ['Update available', '有可用更新', '有可用更新', 'アップデートがあります', '업데이트 가능', 'Actualización disponible', 'Mise à jour disponible', 'Update verfügbar', 'Доступно обновление', 'Atualização disponível'],
    ['Download update', '下载更新', '下載更新', 'アップデートをダウンロード', '업데이트 다운로드', 'Descargar actualización', 'Télécharger la mise à jour', 'Update herunterladen', 'Скачать обновление', 'Baixar atualização'],
    ['Restart to update', '重启以完成更新', '重新啟動以更新', '再起動して更新', '재시작하여 업데이트', 'Reiniciar para actualizar', 'Redémarrer pour mettre à jour', 'Zum Aktualisieren neu starten', 'Перезапустить для обновления', 'Reiniciar para atualizar'],
    ['Auto-update', '自动更新', '自動更新', '自動アップデート', '자동 업데이트', 'Actualización automática', 'Mise à jour automatique', 'Automatische Updates', 'Автообновление', 'Atualização automática'],
    ['Release Notes', '更新日志', '版本資訊', 'リリースノート', '릴리스 노트', 'Notas de la versión', 'Notes de version', 'Versionshinweise', 'Примечания к выпуску', 'Notas da versão'],
    ['What\'s New', '新增功能', '新功能', '新機能', '새로운 기능', 'Novedades', 'Nouveautés', 'Neuigkeiten', 'Что нового', 'Novidades'],
    ['Changelog', '变更日志', '變更紀錄', '変更履歴', '변경 로그', 'Registro de cambios', 'Journal des modifications', 'Änderungsprotokoll', 'Журнал изменений', 'Registro de alterações'],
    ['About', '关于', '關於', 'このアプリについて', '정보', 'Acerca de', 'À propos', 'Über', 'О программе', 'Sobre'],
    ['Version', '版本', '版本', 'バージョン', '버전', 'Versión', 'Numéro de version', 'Programmversion', 'Версия', 'Versão'],
    ['License', '许可证', '授權條款', 'ライセンス', '라이선스', 'Licencia', 'Licence', 'Lizenz', 'Лицензия', 'Licença'],
    ['Terms of Service', '服务条款', '服務條款', '利用規約', '서비스 약관', 'Términos del servicio', 'Conditions d’utilisation', 'Nutzungsbedingungen', 'Условия использования', 'Termos de serviço'],
    ['Privacy Policy', '隐私政策', '隱私權政策', 'プライバシーポリシー', '개인정보 처리방침', 'Política de privacidad', 'Politique de confidentialité', 'Datenschutzerklärung', 'Политика конфиденциальности', 'Política de privacidade'],
    ['Advanced', '高级', '進階', '詳細設定', '고급', 'Avanzado', 'Avancé', 'Erweitert', 'Дополнительно', 'Avançado'],
    ['Developer', '开发者', '開發人員', '開発者', '개발자', 'Desarrollador', 'Développeur', 'Entwickler', 'Разработчик', 'Desenvolvedor'],
    ['Diagnostics', '诊断', '診斷', '診断', '진단', 'Diagnóstico', 'Diagnostics système', 'Diagnose', 'Диагностика', 'Diagnóstico'],
    ['Logs', '日志', '日誌', 'ログ', '로그', 'Registros', 'Journaux', 'Protokolle', 'Журналы', 'Registros'],
    ['Open Logs', '打开日志', '開啟日誌', 'ログを開く', '로그 열기', 'Abrir registros', 'Ouvrir les journaux', 'Protokolle öffnen', 'Открыть журналы', 'Abrir registros'],
    ['Experimental', '实验性功能', '實驗性功能', '実験的機能', '실험적 기능', 'Experimental', 'Expérimental', 'Experimentell', 'Экспериментальные', 'Experimental'],
    ['Experimental features', '实验性功能', '實驗性功能', '実験的な機能', '실험적 기능 목록', 'Funciones experimentales', 'Fonctionnalités expérimentales', 'Experimentelle Funktionen', 'Экспериментальные функции', 'Recursos experimentais'],
    ['Reset to defaults', '恢复默认设置', '重設為預設值', '既定値にリセット', '기본값으로 재설정', 'Restablecer valores predeterminados', 'Rétablir les valeurs par défaut', 'Auf Standardwerte zurücksetzen', 'Сбросить по умолчанию', 'Restaurar padrões'],
    ['Restore defaults', '恢复默认', '還原預設值', 'デフォルトに戻す', '기본값 복원', 'Restaurar valores predeterminados', 'Restaurer les paramètres par défaut', 'Standard wiederherstellen', 'Восстановить настройки по умолчанию', 'Restaurar configurações padrão'],
    ['Reset settings', '重置设置', '重設設定', '設定をリセット', '설정 재설정', 'Restablecer configuración', 'Réinitialiser les paramètres', 'Einstellungen zurücksetzen', 'Сбросить настройки', 'Redefinir configurações'],
    ['Sync', '同步', '同步', '同期', '동기화', 'Sincronizar', 'Synchroniser', 'Synchronisieren', 'Синхронизация', 'Sincronizar'],
    ['Cloud Sync', '云同步', '雲端同步', 'クラウド同期', '클라우드 동기화', 'Sincronización en la nube', 'Synchronisation cloud', 'Cloud-Synchronisierung', 'Облачная синхронизация', 'Sincronização na nuvem'],
    ['Auto-approve', '自动批准', '自動核准', '自動承認', '자동 승인', 'Aprobación automática', 'Approbation automatique', 'Automatisch genehmigen', 'Автоодобрение', 'Aprovação automática'],
    ['Auto-run', '自动运行', '自動執行', '自動実行', '자동 실행', 'Ejecución automática', 'Exécution automatique', 'Automatisch ausführen', 'Автозапуск', 'Execução automática'],
    ['Safe mode', '安全模式', '安全模式', 'セーフモード', '안전 모드', 'Modo seguro', 'Mode sans échec', 'Abgesicherter Modus', 'Безопасный режим', 'Modo de segurança'],
    ['Workspace Trust', '工作区信任', '工作區信任', 'ワークスペースの信頼', '작업 공간 신뢰', 'Confianza del espacio', 'Confiance de l’espace', 'Arbeitsbereichsvertrauen', 'Доверие к пространству', 'Confiança do espaço'],
    ['Approval Policy', '审批策略', '核准原則', '承認ポリシー', '승인 정책', 'Política de aprobación', 'Politique d’approbation', 'Genehmigungsrichtlinie', 'Политика одобрения', 'Política de aprovação'],
    ['Execution Policy', '执行策略', '執行原則', '実行ポリシー', '실행 정책', 'Política de ejecución', 'Politique d’exécution', 'Ausführungsrichtlinie', 'Политика выполнения', 'Política de execução'],
    ['Default Model', '默认模型', '預設模型', '既定モデル', '기본 모델', 'Modelo predeterminado', 'Modèle par défaut', 'Standardmodell', 'Модель по умолчанию', 'Modelo padrão'],
    ['Default Workspace', '默认工作区', '預設工作區', '既定ワークスペース', '기본 작업 공간', 'Espacio predeterminado', 'Espace par défaut', 'Standard-Arbeitsbereich', 'Пространство по умолчанию', 'Espaço padrão'],
    ['Startup', '启动', '啟動', '起動時', '시작', 'Inicio del programa', 'Démarrage', 'Systemstart', 'Запуск', 'Inicialização'],
    ['Behavior', '行为', '行為', '動作', '동작', 'Comportamiento', 'Comportement', 'Verhalten', 'Поведение', 'Comportamento'],
    ['Accessibility', '辅助功能', '協助工具', 'アクセシビリティ', '접근성', 'Accesibilidad', 'Accessibilité', 'Barrierefreiheit', 'Специальные возможности', 'Acessibilidade'],
    ['Compact mode', '紧凑模式', '精簡模式', 'コンパクトモード', '컴팩트 모드', 'Modo compacto', 'Mode compact', 'Kompaktmodus', 'Компактный режим', 'Modo compacto'],
    ['Density', '界面密度', '介面密度', '表示密度', '밀도', 'Densidad', 'Densité', 'Dichte', 'Плотность', 'Densidade'],

    // ── 4. Common Modals, Actions, Filters & Statuses ────────────────────────
    ['Save', '保存', '儲存', '保存', '저장', 'Guardar', 'Enregistrer', 'Speichern', 'Сохранить', 'Salvar'],
    ['Save changes', '保存更改', '儲存變更', '変更を保存', '변경 사항 저장', 'Guardar cambios', 'Enregistrer les modifications', 'Änderungen speichern', 'Сохранить изменения', 'Salvar alterações'],
    ['Save as', '另存为', '另存新檔', '名前を付けて保存', '다른 이름으로 저장', 'Guardar como', 'Enregistrer sous', 'Speichern unter', 'Сохранить как', 'Salvar como'],
    ['Saved', '已保存', '已儲存', '保存済み', '저장됨', 'Guardado', 'Enregistré', 'Gespeichert', 'Сохранено', 'Salvo'],
    ['Unsaved changes', '有未保存的更改', '有未儲存的變更', '未保存の変更', '저장되지 않은 변경 사항', 'Cambios sin guardar', 'Modifications non enregistrées', 'Ungespeicherte Änderungen', 'Несохранённые изменения', 'Alterações não salvas'],
    ['Close', '关闭', '關閉', '閉じる', '닫기', 'Cerrar', 'Fermer', 'Schließen', 'Закрыть', 'Fechar'],
    ['Close tab', '关闭标签页', '關閉分頁', 'タブを閉じる', '탭 닫기', 'Cerrar pestaña', 'Fermer l’onglet', 'Tab schließen', 'Закрыть вкладку', 'Fechar aba'],
    ['Close window', '关闭窗口', '關閉視窗', 'ウィンドウを閉じる', '창 닫기', 'Cerrar ventana', 'Fermer la fenêtre', 'Fenster schließen', 'Закрыть окно', 'Fechar janela'],
    ['Confirm', '确认', '確認', '確認', '확인', 'Confirmar', 'Confirmer', 'Bestätigen', 'Подтвердить', 'Confirmar'],
    ['Are you sure?', '确定要继续吗？', '您確定嗎？', 'よろしいですか？', '정말 진행하시겠습니까?', '¿Estás seguro?', 'Êtes-vous sûr ?', 'Sind Sie sicher?', 'Вы уверены?', 'Tem certeza?'],
    ['Reset', '重置', '重設', 'リセット', '재설정', 'Restablecer', 'Réinitialiser', 'Zurücksetzen', 'Сбросить', 'Redefinir'],
    ['Export', '导出', '匯出', 'エクスポート', '내보내기', 'Exportar', 'Exporter', 'Exportieren', 'Экспорт', 'Exportar'],
    ['Import', '导入', '匯入', 'インポート', '가져오기', 'Importar', 'Importer', 'Importieren', 'Импорт', 'Importar'],
    ['Download', '下载', '下載', 'ダウンロード', '다운로드', 'Descargar', 'Télécharger', 'Herunterladen', 'Скачать', 'Baixar'],
    ['Upload', '上传', '上傳', 'アップロード', '업로드', 'Subir', 'Téléverser', 'Hochladen', 'Загрузить', 'Enviar arquivo'],
    ['Copied', '已复制', '已複製', 'コピーしました', '복사됨', 'Copiado', 'Copié', 'Kopiert', 'Скопировано', 'Copiado'],
    ['Copied to clipboard', '已复制到剪贴板', '已複製到剪貼簿', 'クリップボードにコピーしました', '클립보드에 복사됨', 'Copiado al portapapeles', 'Copié dans le presse-papiers', 'In die Zwischenablage kopiert', 'Скопировано в буфер обмена', 'Copiado para a área de transferência'],
    ['Refresh', '刷新', '重新整理', '更新', '새로 고침', 'Actualizar', 'Actualiser', 'Aktualisieren', 'Обновить', 'Atualizar'],
    ['Reload', '重新加载', '重新載入', '再読み込み', '다시 로드', 'Recargar', 'Recharger', 'Neu laden', 'Перезагрузить', 'Recarregar'],
    ['Reload window', '重新加载窗口', '重新載入視窗', 'ウィンドウを再読み込み', '창 다시 로드', 'Recargar ventana', 'Recharger la fenêtre', 'Fenster neu laden', 'Перезагрузить окно', 'Recarregar janela'],
    ['Restart', '重启', '重新啟動', '再起動', '다시 시작', 'Reiniciar', 'Redémarrer', 'Neu starten', 'Перезапустить', 'Reiniciar'],
    ['Enable', '启用', '啟用', '有効化', '활성화', 'Activar', 'Activer', 'Aktivieren', 'Включить', 'Ativar'],
    ['Disable', '禁用', '停用', '無効化', '비활성화', 'Desactivar', 'Désactiver', 'Deaktivieren', 'Отключить', 'Desativar'],
    ['Enabled', '已启用', '已啟用', '有効', '활성화됨', 'Activado', 'Activé', 'Aktiviert', 'Включено', 'Ativado'],
    ['Disabled', '已禁用', '已停用', '無効', '비활성화됨', 'Desactivado', 'Désactivé', 'Deaktiviert', 'Отключено', 'Desativado'],
    ['On', '开', '開', 'オン', '켜짐', 'Activado', 'Activé', 'Ein', 'Вкл', 'Ligado'],
    ['Off', '关', '關', 'オフ', '꺼짐', 'Desactivado', 'Désactivé', 'Aus', 'Выкл', 'Desligado'],
    ['Install', '安装', '安裝', 'インストール', '설치', 'Instalar', 'Installer', 'Installieren', 'Установить', 'Instalar'],
    ['Uninstall', '卸载', '解除安裝', 'アンインストール', '제거', 'Desinstalar', 'Désinstaller', 'Deinstallieren', 'Удалить', 'Desinstalar'],
    ['Installing...', '正在安装...', '正在安裝...', 'インストール中...', '설치 중...', 'Instalando...', 'Installation...', 'Wird installiert...', 'Установка...', 'Instalando...'],
    ['Updating...', '正在更新...', '正在更新...', '更新中...', '업데이트 중...', 'Actualizando...', 'Mise à jour...', 'Wird aktualisiert...', 'Обновление...', 'Atualizando...'],
    ['Update', '更新', '更新', '更新する', '업데이트', 'Actualizar ahora', 'Mettre à jour', 'Aktualisieren', 'Обновить', 'Atualizar'],
    ['Update all', '全部更新', '全部更新', 'すべて更新', '모두 업데이트', 'Actualizar todo', 'Tout mettre à jour', 'Alle aktualisieren', 'Обновить все', 'Atualizar tudo'],
    ['Installed', '已安装', '已安裝', 'インストール済み', '설치됨', 'Instalado', 'Installé', 'Installiert', 'Установлено', 'Instalado'],
    ['Available', '可用', '可用', '利用可能', '사용 가능', 'Disponible', 'Disponible', 'Verfügbar', 'Доступно', 'Disponível'],
    ['Featured', '精选', '精選', 'おすすめ', '추천 항목', 'Destacados', 'À la une', 'Empfohlen', 'Рекомендуемые', 'Destaques'],
    ['Popular', '热门', '熱門', '人気', '인기', 'Populares', 'Populaire', 'Beliebt', 'Популярные', 'Populares'],
    ['Recommended', '推荐', '推薦', '推奨', '권장', 'Recomendado', 'Recommandé', 'Empfohlen', 'Рекомендовано', 'Recomendado'],
    ['Search', '搜索', '搜尋', '検索', '검색', 'Buscar', 'Rechercher', 'Suchen', 'Поиск', 'Pesquisar'],
    ['Search...', '搜索...', '搜尋...', '検索...', '검색...', 'Buscar...', 'Rechercher...', 'Suchen...', 'Поиск...', 'Pesquisar...'],
    ['Filter', '筛选', '篩選', 'フィルター', '필터', 'Filtrar', 'Filtrer', 'Filtern', 'Фильтр', 'Filtrar'],
    ['Sort', '排序', '排序', '並べ替え', '정렬', 'Ordenar', 'Trier', 'Sortieren', 'Сортировать', 'Ordenar'],
    ['Sort by', '排序方式', '排序方式', '並び順', '정렬 기준', 'Ordenar por', 'Trier par', 'Sortieren nach', 'Сортировать по', 'Ordenar por'],
    ['Newest', '最新', '最新', '新しい順', '최신순', 'Más recientes', 'Plus récents', 'Neueste', 'Сначала новые', 'Mais recentes'],
    ['Oldest', '最早', '最舊', '古い順', '오래된순', 'Más antiguos', 'Plus anciens', 'Älteste', 'Сначала старые', 'Mais antigos'],
    ['Most recent', '最近使用', '最近使用', '最近順', '최근 순', 'Más reciente', 'Les plus récents', 'Zuletzt verwendet', 'Недавние', 'Mais recente'],
    ['Name', '名称', '名稱', '名前', '이름', 'Nombre', 'Nom', 'Bezeichnung', 'Имя', 'Nome'],
    ['Date', '日期', '日期', '日付', '날짜', 'Fecha', 'Date de création', 'Datum', 'Дата', 'Data'],
    ['Size', '大小', '大小', 'サイズ', '크기', 'Tamaño', 'Taille', 'Größe', 'Размер', 'Tamanho'],
    ['Status', '状态', '狀態', 'ステータス', '상태', 'Estado', 'Statut', 'Zustand', 'Статус', 'Situação'],
    ['Type', '类型', '類型', '種類', '유형', 'Tipo', 'Type d’élément', 'Typ', 'Тип', 'Tipo'],
    ['Category', '分类', '分類', 'カテゴリ', '카테고리', 'Categoría', 'Catégorie', 'Kategorie', 'Категория', 'Categoria'],
    ['All', '全部', '全部', 'すべて', '전체', 'Todo', 'Tout', 'Alle', 'Все', 'Tudo'],
    ['Active', '活跃', '使用中', 'アクティブ', '활성', 'Activo', 'Actif', 'Aktiv', 'Активно', 'Ativo'],
    ['Running', '运行中', '執行中', '実行中', '실행 중', 'En ejecución', 'En cours', 'Läuft', 'Выполняется', 'Em execução'],
    ['Pending', '待处理', '待處理', '保留中', '대기 중', 'Pendiente', 'En attente', 'Ausstehend', 'Ожидает', 'Pendente'],
    ['Done', '完成', '完成', '完了', '완료', 'Hecho', 'Terminé', 'Fertig', 'Готово', 'Concluído'],
    ['Error', '错误', '錯誤', 'エラー', '오류', 'Fallo', 'Erreur', 'Fehler', 'Ошибка', 'Erro'],
    ['Warning', '警告', '警告', '警告', '경고', 'Advertencia', 'Avertissement', 'Warnung', 'Предупреждение', 'Aviso'],
    ['Info', '信息', '資訊', '情報', '정보', 'Información', 'Informations', 'Hinweis', 'Сведения', 'Informações'],
    ['Success', '成功', '成功', '成功', '성공', 'Éxito', 'Succès', 'Erfolg', 'Успешно', 'Sucesso'],
    ['Back', '返回', '返回', '戻る', '뒤로', 'Atrás', 'Retour', 'Zurück', 'Назад', 'Voltar'],
    ['Next', '下一步', '下一步', '次へ', '다음', 'Siguiente', 'Suivant', 'Weiter', 'Далее', 'Avançar'],
    ['Previous', '上一步', '上一步', '前へ', '이전', 'Anterior', 'Précédent', 'Zurück', 'Назад', 'Anterior'],
    ['Finish', '完成', '完成', '完了', '마침', 'Finalizar', 'Terminer', 'Fertigstellen', 'Готово', 'Concluir'],
    ['Skip', '跳过', '略過', 'スキップ', '건너뛰기', 'Omitir', 'Ignorer', 'Überspringen', 'Пропустить', 'Pular'],
    ['Learn more', '了解更多', '深入瞭解', '詳細を見る', '자세히 알아보기', 'Más información', 'En savoir plus', 'Mehr erfahren', 'Подробнее', 'Saiba mais'],
    ['Read more', '阅读更多', '閱讀更多', '続きを読む', '더 읽기', 'Leer más', 'Lire la suite', 'Weiterlesen', 'Читать далее', 'Ler mais'],
    ['Open in browser', '在浏览器中打开', '在瀏覽器中開啟', 'ブラウザで開く', '브라우저에서 열기', 'Abrir en el navegador', 'Ouvrir dans le navigateur', 'Im Browser öffnen', 'Открыть в браузере', 'Abrir no navegador'],
    ['Open file', '打开文件', '開啟檔案', 'ファイルを開く', '파일 열기', 'Abrir archivo', 'Ouvrir le fichier', 'Datei öffnen', 'Открыть файл', 'Abrir arquivo'],
    ['Reveal in Finder', '在访达中显示', '在 Finder 中顯示', 'Finder で表示', 'Finder에서 보기', 'Mostrar en Finder', 'Afficher dans le Finder', 'Im Finder anzeigen', 'Показать в Finder', 'Mostrar no Finder'],
    ['Show in Explorer', '在资源管理器中显示', '在檔案總管中顯示', 'エクスプローラーで表示', '탐색기에서 보기', 'Mostrar en el Explorador', 'Afficher dans l’Explorateur', 'Im Explorer anzeigen', 'Показать в Проводнике', 'Mostrar no Explorador'],
    ['Copy path', '复制路径', '複製路徑', 'パスをコピー', '경로 복사', 'Copiar ruta', 'Copier le chemin', 'Pfad kopieren', 'Копировать путь', 'Copiar caminho'],
    ['Copy link', '复制链接', '複製連結', 'リンクをコピー', '링크 복사', 'Copiar enlace', 'Copier le lien', 'Link kopieren', 'Копировать ссылку', 'Copiar link'],
    ['Duplicate', '创建副本', '建立副本', '複製', '복제', 'Duplicar', 'Dupliquer', 'Duplizieren', 'Дублировать', 'Duplicar'],
    ['Move', '移动', '移動', '移動', '이동', 'Mover', 'Déplacer', 'Verschieben', 'Переместить', 'Mover'],
    ['Create', '创建', '建立', '作成', '생성', 'Crear', 'Créer', 'Erstellen', 'Создать', 'Criar'],
    ['New', '新建', '新增', '新規', '새로 만들기', 'Nuevo', 'Nouveau', 'Neu', 'Создать', 'Novo'],
    ['Add', '添加', '新增', '追加', '추가', 'Añadir', 'Ajouter', 'Hinzufügen', 'Добавить', 'Adicionar'],
    ['Remove', '移除', '移除', '削除', '제거', 'Quitar', 'Retirer', 'Entfernen', 'Удалить', 'Remover'],
    ['Modify', '修改', '修改', '変更', '수정', 'Modificar', 'Modifier', 'Ändern', 'Изменить', 'Modificar'],
    ['Select', '选择', '選擇', '選択', '선택', 'Seleccionar', 'Sélectionner', 'Auswählen', 'Выбрать', 'Selecionar'],
    ['Select all', '全选', '全選', 'すべて選択', '모두 선택', 'Seleccionar todo', 'Tout sélectionner', 'Alle auswählen', 'Выбрать все', 'Selecionar tudo'],
    ['Deselect all', '取消全选', '取消全選', '選択をすべて解除', '모두 선택 해제', 'Deseleccionar todo', 'Tout désélectionner', 'Auswahl aufheben', 'Снять выделение', 'Desmarcar tudo'],
    ['None', '无', '無', 'なし', '없음', 'Ninguno', 'Aucun', 'Keine', 'Нет', 'Nenhum'],
    ['Default', '默认', '預設', 'デフォルト', '기본값', 'Predeterminado', 'Par défaut', 'Standard', 'По умолчанию', 'Padrão'],
    ['Custom', '自定义', '自訂', 'カスタム', '사용자 지정', 'Personalizado', 'Personnalisé', 'Benutzerdefiniert', 'Пользовательский', 'Personalizado'],
    ['Optional', '可选', '選填', '任意', '선택 사항', 'Opcional', 'Facultatif', 'Wahlweise', 'Необязательно', 'Opcional'],
    ['Required', '必填', '必填', '必須', '필수', 'Obligatorio', 'Requis', 'Erforderlich', 'Обязательно', 'Obrigatório'],
    ['Yes', '是', '是', 'はい', '예', 'Sí', 'Oui', 'Ja', 'Да', 'Sim'],
    ['No', '否', '否', 'いいえ', '아니요', 'No', 'Non', 'Nein', 'Нет', 'Não'],
    ['Feedback', '反馈', '意見回饋', 'フィードバック', '피드백', 'Comentarios', 'Commentaires', 'Rückmeldung', 'Отзыв', 'Comentários'],
    ['Send feedback', '发送反馈', '傳送意見回饋', 'フィードバックを送信', '피드백 보내기', 'Enviar comentarios', 'Envoyer un commentaire', 'Feedback senden', 'Отправить отзыв', 'Enviar feedback'],
    ['Report issue', '报告问题', '回報問題', '問題を報告', '문제 신고', 'Informar de un problema', 'Signaler un problème', 'Problem melden', 'Сообщить о проблеме', 'Relatar problema'],
    ['Report a bug', '报告缺陷', '回報錯誤', 'バグを報告', '버그 신고', 'Informar de un error', 'Signaler un bogue', 'Fehler melden', 'Сообщить об ошибке', 'Relatar um erro'],
    ['Contact support', '联系支持', '聯絡支援', 'サポートに問い合わせ', '지원 문의', 'Contactar con soporte', 'Contacter l’assistance', 'Support kontaktieren', 'Связаться с поддержкой', 'Contatar o suporte'],
    ['Community', '社区', '社群', 'コミュニティ', '커뮤니티', 'Comunidad', 'Communauté', 'Gemeinschaft', 'Сообщество', 'Comunidade'],
    ['No results found', '未找到匹配结果', '找不到相符結果', '結果が見つかりません', '결과를 찾을 수 없습니다', 'No se encontraron resultados', 'Aucun résultat trouvé', 'Keine Ergebnisse gefunden', 'Ничего не найдено', 'Nenhum resultado encontrado'],
    ['Nothing here yet', '这里暂时空空如也', '這裡還沒有內容', 'まだ何もありません', '아직 항목이 없습니다', 'Aún no hay nada aquí', 'Rien ici pour le moment', 'Noch nichts vorhanden', 'Здесь пока пусто', 'Ainda não há nada aqui'],
    ['Empty', '空', '空白', '空', '비어 있음', 'Vacío', 'Vide', 'Leer', 'Пусто', 'Vazio'],
    ['Try again', '再试一次', '再試一次', 'もう一度試す', '다시 시도', 'Intentar de nuevo', 'Réessayer', 'Erneut versuchen', 'Попробовать снова', 'Tentar novamente'],
    ['Dismiss', '忽略', '忽略', '閉じる', '닫기', 'Descartar', 'Ignorer', 'Schließen', 'Скрыть', 'Dispensar'],
    ['Got it', '知道了', '知道了', '了解', '확인했습니다', 'Entendido', 'Compris', 'Verstanden', 'Понятно', 'Entendi'],
    ['Continue anyway', '仍然继续', '仍要繼續', 'このまま続行', '그래도 계속', 'Continuar de todos modos', 'Continuer quand même', 'Trotzdem fortfahren', 'Всё равно продолжить', 'Continuar mesmo assim'],
    ['More options', '更多选项', '更多選項', 'その他のオプション', '더 많은 옵션', 'Más opciones', 'Plus d’options', 'Weitere Optionen', 'Дополнительные параметры', 'Mais opções'],
    ['More actions', '更多操作', '更多操作', 'その他の操作', '더 많은 작업', 'Más acciones', 'Plus d’actions', 'Weitere Aktionen', 'Другие действия', 'Mais ações'],
    ['Actions', '操作', '操作', 'アクション', '작업', 'Acciones', 'Actions rapides', 'Aktionen', 'Действия', 'Ações'],
    ['Tools', '工具', '工具', 'ツール', '도구', 'Herramientas', 'Outils', 'Werkzeuge', 'Инструменты', 'Ferramentas'],
    ['Tool calls', '工具调用', '工具呼叫', 'ツール呼び出し', '도구 호출', 'Llamadas a herramientas', 'Appels d’outils', 'Werkzeugaufrufe', 'Вызовы инструментов', 'Chamadas de ferramenta'],
    ['Parameters', '参数', '參數', 'パラメーター', '매개변수', 'Parámetros', 'Paramètres d’entrée', 'Parameterwerte', 'Параметры', 'Parâmetros'],
    ['Arguments', '参数值', '引數', '引数', '인수', 'Argumentos', 'Arguments d’appel', 'Argumente', 'Аргументы', 'Argumentos'],
    ['Result', '结果', '結果', '結果', '결과', 'Resultado', 'Résultat', 'Ergebnis', 'Результат', 'Resultado'],
    ['Results', '结果列表', '結果列表', '結果一覧', '결과 목록', 'Resultados', 'Résultats', 'Ergebnisse', 'Результаты', 'Resultados'],
    ['Summary', '摘要', '摘要', '要約', '요약', 'Resumen', 'Résumé', 'Zusammenfassung', 'Сводка', 'Resumo'],
    ['Details', '详情', '詳情', '詳細', '세부 정보', 'Detalles', 'Détails', 'Einzelheiten', 'Подробности', 'Detalhes'],
    ['Timeline', '时间线', '時間軸', 'タイムライン', '타임라인', 'Línea de tiempo', 'Chronologie', 'Zeitverlauf', 'Хронология', 'Linha do tempo'],
    ['Today', '今天', '今天', '今日', '오늘', 'Hoy', 'Aujourd’hui', 'Heute', 'Сегодня', 'Hoje'],
    ['Yesterday', '昨天', '昨天', '昨日', '어제', 'Ayer', 'Hier', 'Gestern', 'Вчера', 'Ontem'],
    ['This week', '本周', '本週', '今週', '이번 주', 'Esta semana', 'Cette semaine', 'Diese Woche', 'На этой неделе', 'Esta semana'],
    ['Older', '更早', '較舊', 'それ以前', '이전 항목', 'Anteriores', 'Plus ancien', 'Älter', 'Ранее', 'Mais antigos'],
    ['Just now', '刚刚', '剛剛', 'たった今', '방금 전', 'Ahora mismo', 'À l’instant', 'Gerade eben', 'Только что', 'Agora mesmo'],
    ['Never', '从不', '永不', 'しない', '안 함', 'Nunca', 'Jamais', 'Nie', 'Никогда', 'Nunca'],
    ['Always', '始终', '一律', '常に', '항상', 'Siempre', 'Toujours', 'Immer', 'Всегда', 'Sempre'],

    // ── 5. Slash Command Descriptions (Command Names Stay Untranslated) ──────
    ['Compact conversation history to free up context', '压缩对话历史以释放上下文空间', '壓縮對話歷史以釋放上下文空間', '会話履歴を圧縮してコンテキストを解放します', '대화 기록을 압축하여 컨텍스트 공간을 확보합니다', 'Compacta el historial para liberar contexto', 'Compacter l’historique pour libérer du contexte', 'Unterhaltungsverlauf komprimieren, um Kontext freizugeben', 'Сжать историю диалога для освобождения контекста', 'Compactar histórico da conversa para liberar contexto'],
    ['Compact conversation to save context', '压缩当前对话以节省上下文', '壓縮目前對話以節省上下文', '会話を圧縮してコンテキストを節約します', '대화를 압축하여 컨텍스트를 절약합니다', 'Compacta la conversación para ahorrar contexto', 'Compacter la conversation pour économiser le contexte', 'Unterhaltung komprimieren, um Kontext zu sparen', 'Сжать диалог для экономии контекста', 'Compactar conversa para economizar contexto'],
    ['Clear conversation history', '清空当前对话历史', '清除目前對話歷史', '会話履歴をクリアします', '대화 기록을 지웁니다', 'Limpia el historial de la conversación', 'Effacer l’historique de la conversation', 'Unterhaltungsverlauf löschen', 'Очистить историю диалога', 'Limpar histórico da conversa'],
    ['Show available commands', '显示所有可用命令', '顯示所有可用指令', '利用可能なコマンドを表示します', '사용 가능한 명령어 표시', 'Muestra los comandos disponibles', 'Afficher les commandes disponibles', 'Verfügbare Befehle anzeigen', 'Показать доступные команды', 'Mostrar comandos disponíveis'],
    ['Show help and available commands', '显示帮助与可用命令', '顯示說明與可用指令', 'ヘルプと利用可能なコマンドを表示します', '도움말 및 사용 가능한 명령어 표시', 'Muestra ayuda y comandos disponibles', 'Afficher l’aide et les commandes disponibles', 'Hilfe und verfügbare Befehle anzeigen', 'Показать справку и доступные команды', 'Mostrar ajuda e comandos disponíveis'],
    ['Review uncommitted changes', '审查未提交的代码更改', '審查未提交的程式碼變更', '未コミットの変更をレビューします', '커밋되지 않은 변경 사항 검토', 'Revisa los cambios sin confirmar', 'Examiner les modifications non validées', 'Nicht festgeschriebene Änderungen prüfen', 'Проверить незафиксированные изменения', 'Revisar alterações não confirmadas'],
    ['Review current changes', '审查当前更改', '審查目前變更', '現在の変更をレビューします', '현재 변경 사항 검토', 'Revisa los cambios actuales', 'Examiner les modifications actuelles', 'Aktuelle Änderungen prüfen', 'Проверить текущие изменения', 'Revisar alterações atuais'],
    ['Generate a commit message', '生成提交说明', '產生提交訊息', 'コミットメッセージを生成します', '커밋 메시지 생성', 'Genera un mensaje de confirmación', 'Générer un message de validation', 'Commit-Nachricht erstellen', 'Сгенерировать сообщение коммита', 'Gerar mensagem de commit'],
    ['Explain the selected code', '解释所选代码', '解釋所選程式碼', '選択したコードを説明します', '선택한 코드 설명', 'Explica el código seleccionado', 'Expliquer le code sélectionné', 'Ausgewählten Code erklären', 'Объяснить выделенный код', 'Explicar o código selecionado'],
    ['Fix errors in the current file', '修复当前文件中的错误', '修復目前檔案中的錯誤', '現在のファイルのエラーを修正します', '현재 파일의 오류 수정', 'Corrige los errores del archivo actual', 'Corriger les erreurs du fichier actuel', 'Fehler in der aktuellen Datei beheben', 'Исправить ошибки в текущем файле', 'Corrigir erros no arquivo atual'],
    ['Write tests for the selected code', '为所选代码编写测试', '為所選程式碼撰寫測試', '選択したコードのテストを作成します', '선택한 코드의 테스트 작성', 'Escribe pruebas para el código seleccionado', 'Écrire des tests pour le code sélectionné', 'Tests für den ausgewählten Code schreiben', 'Написать тесты для выделенного кода', 'Escrever testes para o código selecionado'],
    ['Refactor the selected code', '重构所选代码', '重構所選程式碼', '選択したコードをリファクタリングします', '선택한 코드 리팩터링', 'Refactoriza el código seleccionado', 'Refactoriser le code sélectionné', 'Ausgewählten Code umstrukturieren', 'Рефакторинг выделенного кода', 'Refatorar o código selecionado'],
    ['Summarize this conversation', '总结当前对话要点', '摘要目前對話重點', 'この会話を要約します', '이 대화 요약', 'Resume esta conversación', 'Résumer cette conversation', 'Diese Unterhaltung zusammenfassen', 'Подвести итог этого диалога', 'Resumir esta conversa'],
    ['Switch the active model', '切换当前使用的模型', '切換目前使用的模型', '使用中のモデルを切り替えます', '활성 모델 전환', 'Cambia el modelo activo', 'Changer le modèle actif', 'Aktives Modell wechseln', 'Переключить активную модель', 'Trocar o modelo ativo'],
    ['Open settings', '打开设置面板', '開啟設定面板', '設定を開きます', '설정 열기', 'Abre la configuración', 'Ouvrir les paramètres', 'Einstellungen öffnen', 'Открыть настройки', 'Abrir configurações'],
    ['Export conversation', '导出当前对话', '匯出目前對話', '会話をエクスポートします', '대화 내보내기', 'Exporta la conversación', 'Exporter la conversation', 'Unterhaltung exportieren', 'Экспортировать диалог', 'Exportar conversa'],
    ['Manage rules and instructions', '管理规则与指令', '管理規則與指示', 'ルールと指示を管理します', '규칙 및 지침 관리', 'Administra reglas e instrucciones', 'Gérer les règles et instructions', 'Regeln und Anweisungen verwalten', 'Управление правилами и инструкциями', 'Gerenciar regras e instruções'],
    ['Manage MCP servers', '管理 MCP 服务器', '管理 MCP 伺服器', 'MCP サーバーを管理します', 'MCP 서버 관리', 'Administra servidores MCP', 'Gérer les serveurs MCP', 'MCP-Server verwalten', 'Управление серверами MCP', 'Gerenciar servidores MCP'],
    ['Create a new workflow', '创建新工作流', '建立新工作流程', '新しいワークフローを作成します', '새 워크플로 만들기', 'Crea un nuevo flujo de trabajo', 'Créer un nouveau flux de travail', 'Neuen Arbeitsablauf erstellen', 'Создать новый рабочий процесс', 'Criar um novo fluxo de trabalho'],
    ['Search workspace files', '搜索工作区文件', '搜尋工作區檔案', 'ワークスペース内のファイルを検索します', '작업 공간 파일 검색', 'Busca archivos en el espacio de trabajo', 'Rechercher des fichiers dans l’espace', 'Arbeitsbereichsdateien durchsuchen', 'Поиск файлов в рабочем пространстве', 'Pesquisar arquivos no espaço de trabalho'],
    ['Run a terminal command', '执行终端命令', '執行終端機指令', 'ターミナルコマンドを実行します', '터미널 명령 실행', 'Ejecuta un comando en terminal', 'Exécuter une commande de terminal', 'Terminalbefehl ausführen', 'Выполнить команду в терминале', 'Executar comando no terminal'],
    ['Check context usage and quotas', '查看上下文用量与配额', '檢視上下文用量與配額', 'コンテキスト使用量とクォータを確認します', '컨텍스트 사용량 및 할당량 확인', 'Consulta el uso de contexto y cuotas', 'Vérifier l’utilisation du contexte et les quotas', 'Kontextverbrauch und Kontingente prüfen', 'Проверить использование контекста и квоты', 'Verificar uso de contexto e cotas'],
    ['Toggle planning mode', '切换规划模式', '切換規劃模式', '計画モードを切り替えます', '계획 모드 전환', 'Alterna el modo de planificación', 'Basculer le mode planification', 'Planungsmodus umschalten', 'Переключить режим планирования', 'Alternar modo de planejamento'],
    ['Undo the last change', '撤销上一步更改', '復原上一步變更', '直前の変更を元に戻します', '마지막 변경 사항 실행 취소', 'Deshace el último cambio', 'Annuler la dernière modification', 'Letzte Änderung rückgängig machen', 'Отменить последнее изменение', 'Desfazer a última alteração'],
    ['Restore checkpoint', '恢复检查点', '還原檢查點', 'チェックポイントを復元します', '체크포인트 복원', 'Restaura un punto de control', 'Restaurer le point de contrôle', 'Prüfpunkt wiederherstellen', 'Восстановить контрольную точку', 'Restaurar ponto de verificação'],

    // ── 6. Antigravity 2.35+ Desktop Surfaces & Execution Policies ───────────
    ['Scheduled Tasks', '定时任务', '排程任務', 'スケジュールタスク', '예약된 작업', 'Tareas programadas', 'Tâches planifiées', 'Geplante Aufgaben', 'Запланированные задачи', 'Tarefas agendadas'],
    ['Background Tasks', '后台任务', '背景任務', 'バックグラウンドタスク', '백그라운드 작업', 'Tareas en segundo plano', 'Tâches en arrière-plan', 'Hintergrundaufgaben', 'Фоновые задачи', 'Tarefas em segundo plano'],
    ['Project-Level Settings', '项目级设置', '專案層級設定', 'プロジェクト設定', '프로젝트 수준 설정', 'Configuración del proyecto', 'Paramètres du projet', 'Projekteinstellungen', 'Настройки проекта', 'Configurações do projeto'],
    ['Workspace Settings', '工作区设置', '工作區設定', 'ワークスペース設定', '작업 공간 설정', 'Ajustes del espacio', 'Paramètres de l’espace', 'Arbeitsbereich-Einstellungen', 'Настройки пространства', 'Configurações do espaço'],
    ['Tool Execution Policy', '工具执行策略', '工具執行原則', 'ツール実行ポリシー', '도구 실행 정책', 'Política de herramientas', 'Politique d’exécution', 'Werkzeugrichtlinie', 'Политика инструментов', 'Política de ferramentas'],
    ['Terminal Sandbox', '终端沙箱', '終端機沙箱', 'ターミナルサンドボックス', '터미널 샌드박스', 'Sandbox de terminal', 'Bac à sable terminal', 'Terminal-Sandbox', 'Песочница терминала', 'Sandbox do terminal'],
    ['Non-Workspace File Access', '工作区外文件访问', '非工作區檔案存取', '外部ファイルアクセス', '외부 파일 접근', 'Acceso fuera del espacio', 'Accès hors espace', 'Externer Dateizugriff', 'Внешний доступ к файлам', 'Acesso fora do espaço'],
    ['Internet Access Policy', '联网访问策略', '網路存取原則', 'インターネット接続ポリシー', '인터넷 접근 정책', 'Política de Internet', 'Politique d’accès réseau', 'Internetzugriffsrichtlinie', 'Политика доступа в сеть', 'Política de Internet'],
    ['Permission Grants', '权限授予', '權限授與', '権限の付与', '권한 부여', 'Concesiones de permisos', 'Autorisations accordées', 'Berechtigungen', 'Выданные разрешения', 'Permissões concedidas'],
    ['Command Allowlist', '命令白名单', '指令允許清單', '許可コマンド一覧', '명령 허용 목록', 'Lista de comandos permitidos', 'Commandes autorisées', 'Befehls-Positivliste', 'Разрешённые команды', 'Lista de comandos permitidos'],
    ['Command Denylist', '命令黑名单', '指令封鎖清單', '拒否コマンド一覧', '명령 차단 목록', 'Lista de comandos bloqueados', 'Commandes interdites', 'Befehls-Sperrliste', 'Запрещённые команды', 'Lista de comandos bloqueados'],
    ['Browser Allowlist', '浏览器白名单', '瀏覽器允許清單', 'ブラウザ許可一覧', '브라우저 허용 목록', 'Sitios permitidos', 'Sites autorisés', 'Browser-Positivliste', 'Разрешённые сайты', 'Sites permitidos'],
    ['Auxiliary Pane', '辅助侧栏', '輔助面板', '補助ペイン', '보조 패널', 'Panel auxiliar', 'Volet auxiliaire', 'Hilfsbereich', 'Дополнительная панель', 'Painel auxiliar'],
    ['Files Changed', '已更改文件', '已變更檔案', '変更されたファイル', '변경된 파일', 'Archivos modificados', 'Fichiers modifiés', 'Geänderte Dateien', 'Изменённые файлы', 'Arquivos alterados'],
    ['Terminals', '终端列表', '終端機清單', 'ターミナル一覧', '터미널 목록', 'Terminales', 'Terminaux', 'Terminals-Liste', 'Терминалы', 'Terminais'],
    ['Agent Activity', '智能体动态', '代理動態', 'エージェント活動', '에이전트 활동', 'Actividad del agente', 'Activité de l’agent', 'Agentenaktivität', 'Активность агента', 'Atividade do agente'],
    ['Run in background', '后台运行', '背景執行', 'バックグラウンドで実行', '백그라운드에서 실행', 'Ejecutar en segundo plano', 'Exécuter en arrière-plan', 'Im Hintergrund ausführen', 'Выполнить в фоне', 'Executar em segundo plano'],
    ['Allowlist', '白名单', '允許清單', '許可リスト', '허용 목록', 'Lista permitida', 'Liste autorisée', 'Positivliste', 'Белый список', 'Lista de permissão'],
    ['Denylist', '黑名单', '封鎖清單', '拒否リスト', '차단 목록', 'Lista bloqueada', 'Liste bloquée', 'Sperrliste', 'Чёрный список', 'Lista de bloqueio'],
    ['Sandbox', '沙箱', '沙箱', 'サンドボックス', '샌드박스', 'Entorno aislado', 'Bac à sable', 'Sandbox-Modus', 'Песочница', 'Ambiente isolado'],
    ['Send Now', '立即发送', '立即傳送', '今すぐ送信', '지금 보내기', 'Enviar ahora', 'Envoyer maintenant', 'Jetzt senden', 'Отправить сейчас', 'Enviar agora'],
    ['Skipped', '已跳过', '已略過', 'スキップ済み', '건너뜀', 'Omitido', 'Ignoré', 'Übersprungen', 'Пропущено', 'Pulado'],
    ['Customizations', '自定义配置', '自訂設定', 'カスタマイズ', '사용자 지정 설정', 'Personalizaciones', 'Personnalisations', 'Anpassungen', 'Настройки расширений', 'Personalizações'],
    ['Installed by You', '你安装的', '您安裝的', 'あなたがインストール', '직접 설치함', 'Instalado por ti', 'Installé par vous', 'Von Ihnen installiert', 'Установлено вами', 'Instalado por você'],
    ['Installed Plugins', '已安装插件', '已安裝外掛程式', 'インストール済みプラグイン', '설치된 플러그인', 'Complementos instalados', 'Greffons installés', 'Installierte Plugins', 'Установленные плагины', 'Extensões instaladas'],
    ['Installed Skills', '已安装技能', '已安裝技能', 'インストール済みスキル', '설치된 스킬', 'Habilidades instaladas', 'Compétences installées', 'Installierte Fähigkeiten', 'Установленные навыки', 'Habilidades instaladas'],
    ['Installed MCP Servers', '已安装 MCP 服务器', '已安裝 MCP 伺服器', 'インストール済み MCP サーバー', '설치된 MCP 서버', 'Servidores MCP instalados', 'Serveurs MCP installés', 'Installierte MCP-Server', 'Установленные серверы MCP', 'Servidores MCP instalados'],
    ['Default Customizations', '默认自定义项', '預設自訂項目', 'デフォルトカスタマイズ', '기본 사용자 지정', 'Personalizaciones predeterminadas', 'Personnalisations par défaut', 'Standardanpassungen', 'Настройки по умолчанию', 'Personalizações padrão'],
    ['Other Customizations', '其他自定义项', '其他自訂項目', 'その他のカスタマイズ', '기타 사용자 지정', 'Otras personalizaciones', 'Autres personnalisations', 'Weitere Anpassungen', 'Другие настройки', 'Outras personalizações'],
    ['Archive conversation', '归档对话', '封存對話', '会話をアーカイブ', '대화 보관', 'Archivar conversación', 'Archiver la conversation', 'Unterhaltung archivieren', 'Архивировать диалог', 'Arquivar conversa'],
    ['Unarchive conversation', '取消归档对话', '取消封存對話', 'アーカイブを解除', '대화 보관 해제', 'Desarchivar conversación', 'Désarchiver la conversation', 'Archivierung aufheben', 'Разархивировать диалог', 'Desarquivar conversa'],
    ['Maximize sidebar', '最大化侧边栏', '最大化側邊欄', 'サイドバーを最大化', '사이드바 최대화', 'Maximizar barra lateral', 'Agrandir la barre latérale', 'Seitenleiste maximieren', 'Развернуть боковую панель', 'Maximizar barra lateral'],
    ['Restore sidebar', '恢复侧边栏', '還原側邊欄', 'サイドバーを元に戻す', '사이드바 복원', 'Restaurar barra lateral', 'Restaurer la barre latérale', 'Seitenleiste wiederherstellen', 'Восстановить боковую панель', 'Restaurar barra lateral'],

    // ── 7. Tool Step Statuses & Swarm Collaboration Surfaces (v1.5.0) ────────
    ['Read', '已读取', '已讀取', '読み込み済み', '읽음', 'Leído', 'Lu', 'Gelesen', 'Прочитано', 'Lido'],
    ['Posted', '已发布', '已發佈', '投稿済み', '게시됨', 'Publicado', 'Publié', 'Veröffentlicht', 'Опубликовано', 'Publicado'],
    ['Asking', '正在询问', '正在詢問', '質問中', '질문 중', 'Preguntando', 'Demande en cours', 'Fragt nach', 'Спрашивает', 'Perguntando'],
    ['Listed', '已列出', '已列出', '一覧表示済み', '나열됨', 'Listado', 'Listé', 'Aufgelistet', 'Показан список', 'Listado'],
    ['Checked', '已检查', '已檢查', '確認済み', '확인됨', 'Comprobado', 'Vérifié', 'Geprüft', 'Проверено', 'Verificado'],
    ['Worked', '已处理', '已處理', '作業済み', '작업함', 'Trabajado', 'Traité', 'Bearbeitet', 'Выполнено', 'Processado'],
    ['Thinking…', '正在思考…', '正在思考…', '思考中…', '생각 중…', 'Pensando…', 'Réflexion en cours…', 'Denkt nach…', 'Размышляю…', 'Pensando…'],
    ['Asking a question', '正在提出问题', '正在提出問題', '質問しています', '질문하는 중', 'Haciendo una pregunta', 'Pose une question', 'Stellt eine Frage', 'Задаёт вопрос', 'Fazendo uma pergunta'],
    ['Explored files', '已浏览文件', '已瀏覽檔案', 'ファイルを探索済み', '파일 탐색됨', 'Archivos explorados', 'Fichiers explorés', 'Dateien erkundet', 'Файлы изучены', 'Arquivos explorados'],
    ['Explored file', '已浏览文件', '已瀏覽檔案', 'ファイルを探索済み', '파일 탐색됨', 'Archivo explorado', 'Fichier exploré', 'Datei erkundet', 'Файл изучен', 'Arquivo explorado'],
    ['Ran commands', '已运行命令', '已執行指令', 'コマンドを実行済み', '명령 실행됨', 'Comandos ejecutados', 'Commandes exécutées', 'Befehle ausgeführt', 'Команды выполнены', 'Comandos executados'],
    ['Edited files', '已编辑文件', '已編輯檔案', 'ファイルを編集済み', '파일 편집됨', 'Archivos editados', 'Fichiers modifiés', 'Dateien bearbeitet', 'Файлы изменены', 'Arquivos editados'],
    ['Edited file', '已编辑文件', '已編輯檔案', 'ファイルを編集済み', '파일 편집됨', 'Archivo editado', 'Fichier modifié', 'Datei bearbeitet', 'Файл изменён', 'Arquivo editado'],
    ['Read file', '已读取文件', '已讀取檔案', 'ファイルを読み込み済み', '파일 읽음', 'Archivo leído', 'Fichier lu', 'Datei gelesen', 'Файл прочитан', 'Arquivo lido'],
    ['Read files', '已读取文件', '已讀取檔案', 'ファイルを読み込み済み', '파일 읽음', 'Archivos leídos', 'Fichiers lus', 'Dateien gelesen', 'Файлы прочитаны', 'Arquivos lidos'],
    ['Posted to board', '已发布到公告板', '已發佈至佈告欄', 'ボードに投稿済み', '보드에 게시됨', 'Publicado en el tablero', 'Publié sur le tableau', 'Im Board veröffentlicht', 'Опубликовано на доске', 'Publicado no quadro'],
    ['Read board', '已读取公告板', '已讀取佈告欄', 'ボードを読み込み済み', '보드 읽음', 'Tablero leído', 'Tableau lu', 'Board gelesen', 'Доска прочитана', 'Quadro lido'],
    ['Read messages from board', '已读取公告板消息', '已讀取佈告欄訊息', 'ボードからメッセージを読み込み済み', '보드에서 메시지 읽음', 'Mensajes leídos del tablero', 'Messages lus depuis le tableau', 'Nachrichten aus dem Board gelesen', 'Сообщения с доски прочитаны', 'Mensagens lidas do quadro'],
    ['Waiting on swarm', '正在等待蜂群协作', '正在等待蜂群協作', 'スウォームを待機中', '스웜 대기 중', 'Esperando al enjambre', 'En attente de l’essaim', 'Wartet auf Schwarm', 'Ожидание роя агентов', 'Aguardando o enxame'],
    ['Waiting for swarm', '等待蜂群协作', '等待蜂群協作', 'スウォーム待機中', '스웜 응답 대기 중', 'Esperando al enjambre', 'En attente de l’essaim', 'Wartet auf den Schwarm', 'Ожидание ответа роя', 'Aguardando resposta do enxame'],
    ['Waiting for agent', '等待智能体响应', '等待代理程式回應', 'エージェント待機中', '에이전트 대기 중', 'Esperando al agente', 'En attente de l’agent', 'Wartet auf Agenten', 'Ожидание агента', 'Aguardando o agente'],
    ['Waiting for confirmation', '等待确认', '等待確認', '確認待ち', '확인 대기 중', 'Esperando confirmación', 'En attente de confirmation', 'Wartet auf Bestätigung', 'Ожидание подтверждения', 'Aguardando confirmação'],
    ['Swarm views', '蜂群视图', '蜂群檢視', 'スウォーム表示', '스웜 보기', 'Vistas de enjambre', 'Vues de l’essaim', 'Schwarmansichten', 'Виды роя', 'Visões do enxame'],
    ['Board', '公告板', '佈告欄', 'ボード', '보드', 'Tablero', 'Tableau', 'Aufgabenboard', 'Доска', 'Quadro'],
    ['Members', '成员', '成員', 'メンバー', '멤버', 'Miembros', 'Membres', 'Mitglieder', 'Участники', 'Membros'],
    ['Graph', '关系图', '關係圖', 'グラフ', '그래프', 'Grafo', 'Graphe', 'Diagramm', 'Граф', 'Grafo'],
    ['No swarm in this conversation', '当前对话中暂无蜂群协作', '目前對話中尚無蜂群協作', 'この会話にはスウォームがありません', '이 대화에는 스웜이 없습니다', 'No hay enjambre en esta conversación', 'Aucun essaim dans cette conversation', 'Kein Schwarm in dieser Unterhaltung', 'В этом диалоге нет роя агентов', 'Nenhum enxame nesta conversa'],
    ['Open coordinator chat', '打开协调者对话', '開啟協調者對話', 'コーディネーターチャットを開く', '코디네이터 채팅 열기', 'Abrir chat del coordinador', 'Ouvrir le chat du coordinateur', 'Koordinator-Chat öffnen', 'Открыть чат координатора', 'Abrir chat do coordenador'],
    ['Coordinator', '协调者', '協調者', 'コーディネーター', '코디네이터', 'Coordinador', 'Coordinateur', 'Koordinator', 'Координатор', 'Coordenador'],
    ['Worker', '执行节点', '執行節點', 'ワーカー', '워커', 'Trabajador', 'Agent travailleur', 'Arbeiter', 'Исполнитель', 'Trabalhador'],
    ['Workers', '执行节点列表', '執行節點列表', 'ワーカー一覧', '워커 목록', 'Trabajadores', 'Agents travailleurs', 'Arbeiter-Liste', 'Исполнители', 'Trabalhadores'],
    ['All members', '全部成员', '所有成員', 'すべてのメンバー', '모든 멤버', 'Todos los miembros', 'Tous les membres', 'Alle Mitglieder', 'Все участники', 'Todos os membros'],
    ['Broadcast', '广播消息', '廣播訊息', 'ブロードキャスト', '브로드캐스트', 'Difundir', 'Diffusion', 'Rundsenden', 'Рассылка', 'Transmissão'],
    ['Waiting for tasks', '等待任务分配', '等待任務指派', 'タスク待機中', '작업 대기 중', 'Esperando tareas', 'En attente de tâches', 'Wartet auf Aufgaben', 'Ожидание задач', 'Aguardando tarefas'],
    ['Killed', '已终止', '已終止', '強制終了済み', '종료됨', 'Terminado', 'Interrompu', 'Beendet', 'Завершён принудительно', 'Encerrado'],
    ['Swarm monitor', '蜂群监控', '蜂群監控', 'スウォームモニター', '스웜 모니터', 'Monitor de enjambre', 'Moniteur d’essaim', 'Schwarm-Monitor', 'Монитор роя', 'Monitor do enxame'],
    ['Task board', '任务看板', '任務看板', 'タスクボード', '작업 보드', 'Tablero de tareas', 'Tableau des tâches', 'Aufgaben-Board', 'Доска задач', 'Quadro de tarefas'],
  ];

  // Pattern tuple order: [regexSource, flags, zh-CN, zh-TW, ja, ko, es, fr, de, ru, pt-BR]
  const PATTERN_ROWS = [
    [
      '^(\\d+)\\s+files?\\s+changed$', '',
      '{1} 个文件已更改', '{1} 個檔案已變更', '{1} 件のファイルを変更', '{1}개 파일 변경됨',
      '{1} archivo(s) modificado(s)', '{1} fichier(s) modifié(s)', '{1} Datei(en) geändert',
      'Изменено файлов: {1}', '{1} arquivo(s) alterado(s)',
    ],
    [
      '^Thinking for (\\d+)h (\\d+)m (\\d+(?:\\.\\d+)?)s$', '',
      '已思考 {1} 小时 {2} 分 {3} 秒', '已思考 {1} 小時 {2} 分 {3} 秒', '{1}時間{2}分{3}秒思考中', '{1}시간 {2}분 {3}초째 생각 중',
      'Pensando durante {1} h {2} m {3} s', 'Réflexion depuis {1} h {2} m {3} s', 'Denkt seit {1} Std. {2} Min. {3} Sek. nach',
      'Размышляет {1} ч {2} м {3} с', 'Pensando há {1} h {2} m {3} s',
    ],
    [
      '^Thinking for (\\d+)m (\\d+(?:\\.\\d+)?)s$', '',
      '已思考 {1} 分 {2} 秒', '已思考 {1} 分 {2} 秒', '{1}分{2}秒思考中', '{1}분 {2}초째 생각 중',
      'Pensando durante {1} m {2} s', 'Réflexion depuis {1} m {2} s', 'Denkt seit {1} Min. {2} Sek. nach',
      'Размышляет {1} м {2} с', 'Pensando há {1} m {2} s',
    ],
    [
      '^Thought for < (\\d+)s$', '',
      '思考了不到 {1} 秒', '思考了不到 {1} 秒', '{1}秒未満思考しました', '{1}초 미만 생각함',
      'Pensó durante menos de {1} s', 'A réfléchi pendant moins de {1} s', 'Dachte weniger als {1} Sek. nach',
      'Размышлял менее {1} с', 'Pensou por menos de {1} s',
    ],
    [
      '^Thought for less than a second$', '',
      '思考了不到 1 秒', '思考了不到 1 秒', '1秒未満思考しました', '1초 미만 생각함',
      'Pensó durante menos de un segundo', 'A réfléchi pendant moins d’une seconde', 'Dachte weniger als eine Sekunde nach',
      'Размышлял менее секунды', 'Pensou por menos de um segundo',
    ],
    [
      '^Thought for\\s+(.+)$', '',
      '思考了 {1}', '思考了 {1}', '{1} 思考しました', '{1} 동안 생각함',
      'Pensó durante {1}', 'A réfléchi pendant {1}', 'Dachte {1} nach',
      'Размышлял {1}', 'Pensou por {1}',
    ],
    [
      '^Thinking for\\s+(.+)$', '',
      '已思考 {1}', '已思考 {1}', '{1} 思考中', '{1}째 생각 중',
      'Pensando durante {1}', 'Réflexion depuis {1}', 'Denkt seit {1} nach',
      'Размышляет {1}', 'Pensando há {1}',
    ],
    [
      '^Worked for < (\\d+)s$', '',
      '处理耗时不到 {1} 秒', '處理耗時不到 {1} 秒', '{1}秒未満作業しました', '{1}초 미만 작업함',
      'Trabajó menos de {1} s', 'A travaillé moins de {1} s', 'Arbeitete weniger als {1} Sek.',
      'Работал менее {1} с', 'Trabalhou por menos de {1} s',
    ],
    [
      '^Worked for (\\d+)m (\\d+(?:\\.\\d+)?)s$', '',
      '已处理 {1} 分 {2} 秒', '已處理 {1} 分 {2} 秒', '{1}分{2}秒作業しました', '{1}분 {2}초 동안 작업함',
      'Trabajó durante {1} m {2} s', 'A travaillé pendant {1} m {2} s', 'Arbeitete {1} Min. {2} Sek.',
      'Работал {1} м {2} с', 'Trabalhou por {1} m {2} s',
    ],
    [
      '^Explored (\\d+) files?, ran (\\d+) commands?(?:,| and) edited (\\d+) files?$', '',
      '浏览了 {1} 个文件，运行了 {2} 条命令，编辑了 {3} 个文件', '瀏覽了 {1} 個檔案，執行了 {2} 條指令，編輯了 {3} 個檔案', '{1} 件のファイルを探索し、{2} 件のコマンドを実行して、{3} 件のファイルを編集しました', '파일 {1}개 탐색, 명령 {2}개 실행, 파일 {3}개 편집',
      'Exploró {1} archivo(s), ejecutó {2} comando(s) y editó {3} archivo(s)', '{1} fichier(s) exploré(s), {2} commande(s) exécutée(s) et {3} fichier(s) modifié(s)', '{1} Datei(en) erkundet, {2} Befehl(e) ausgeführt und {3} Datei(en) bearbeitet',
      'Изучено файлов: {1}, выполнено команд: {2}, изменено файлов: {3}', 'Explorou {1} arquivo(s), executou {2} comando(s) e editou {3} arquivo(s)',
    ],
    [
      '^Explored (\\d+) files? and ran (\\d+) commands?$', '',
      '浏览了 {1} 个文件并运行了 {2} 条命令', '瀏覽了 {1} 個檔案並執行了 {2} 條指令', '{1} 件のファイルを探索し、{2} 件のコマンドを実行しました', '파일 {1}개 탐색 및 명령 {2}개 실행',
      'Exploró {1} archivo(s) y ejecutó {2} comando(s)', '{1} fichier(s) exploré(s) et {2} commande(s) exécutée(s)', '{1} Datei(en) erkundet und {2} Befehl(e) ausgeführt',
      'Изучено файлов: {1}, выполнено команд: {2}', 'Explorou {1} arquivo(s) e executou {2} comando(s)',
    ],
    [
      '^Explored (\\d+) files? and edited (\\d+) files?$', '',
      '浏览了 {1} 个文件并编辑了 {2} 个文件', '瀏覽了 {1} 個檔案並編輯了 {2} 個檔案', '{1} 件のファイルを探索し、{2} 件のファイルを編集しました', '파일 {1}개 탐색 및 파일 {2}개 편집',
      'Exploró {1} archivo(s) y editó {2} archivo(s)', '{1} fichier(s) exploré(s) et {2} fichier(s) modifié(s)', '{1} Datei(en) erkundet und {2} Datei(en) bearbeitet',
      'Изучено файлов: {1}, изменено файлов: {2}', 'Explorou {1} arquivo(s) e editou {2} arquivo(s)',
    ],
    [
      '^Ran (\\d+) commands? and edited (\\d+) files?$', '',
      '运行了 {1} 条命令并编辑了 {2} 个文件', '執行了 {1} 條指令並編輯了 {2} 個檔案', '{1} 件のコマンドを実行し、{2} 件のファイルを編集しました', '명령 {1}개 실행 및 파일 {2}개 편집',
      'Ejecutó {1} comando(s) y editó {2} archivo(s)', '{1} commande(s) exécutée(s) et {2} fichier(s) modifié(s)', '{1} Befehl(e) ausgeführt und {2} Datei(en) bearbeitet',
      'Выполнено команд: {1}, изменено файлов: {2}', 'Executou {1} comando(s) e editou {2} arquivo(s)',
    ],
    [
      '^Edited (\\d+) files?$', '',
      '已编辑 {1} 个文件', '已編輯 {1} 個檔案', '{1} 件のファイルを編集済み', '파일 {1}개 편집됨',
      '{1} archivo(s) editado(s)', '{1} fichier(s) modifié(s)', '{1} Datei(en) bearbeitet',
      'Изменено файлов: {1}', '{1} arquivo(s) editado(s)',
    ],
    [
      '^Read (\\d+) files?$', '',
      '已读取 {1} 个文件', '已讀取 {1} 個檔案', '{1} 件のファイルを読み込み済み', '파일 {1}개 읽음',
      '{1} archivo(s) leído(s)', '{1} fichier(s) lu(s)', '{1} Datei(en) gelesen',
      'Прочитано файлов: {1}', '{1} arquivo(s) lido(s)',
    ],
    [
      '^Analyzed (\\d+) files?$', '',
      '已分析 {1} 个文件', '已分析 {1} 個檔案', '{1} 件のファイルを分析済み', '파일 {1}개 분석됨',
      '{1} archivo(s) analizado(s)', '{1} fichier(s) analysé(s)', '{1} Datei(en) analysiert',
      'Проанализировано файлов: {1}', '{1} arquivo(s) analisado(s)',
    ],
    [
      '^Listed (\\d+) files?$', '',
      '已列出 {1} 个文件', '已列出 {1} 個檔案', '{1} 件のファイルを一覧表示済み', '파일 {1}개 나열됨',
      '{1} archivo(s) listado(s)', '{1} fichier(s) listé(s)', '{1} Datei(en) aufgelistet',
      'Показано файлов: {1}', '{1} arquivo(s) listado(s)',
    ],
    [
      '^Searched (\\d+) files?$', '',
      '已搜索 {1} 个文件', '已搜尋 {1} 個檔案', '{1} 件のファイルを検索済み', '파일 {1}개 검색됨',
      '{1} archivo(s) buscado(s)', '{1} fichier(s) parcouru(s)', '{1} Datei(en) durchsucht',
      'Проверено файлов: {1}', '{1} arquivo(s) pesquisado(s)',
    ],
    [
      '^Exited with code (-?\\d+)$', '',
      '已退出，退出码 {1}', '已結束，結束代碼 {1}', '終了コード {1} で終了しました', '종료 코드 {1}(으)로 종료됨',
      'Finalizó con código {1}', 'Terminé avec le code {1}', 'Beendet mit Code {1}',
      'Завершено с кодом {1}', 'Encerrado com código {1}',
    ],
    [
      '^Read (\\d+) messages? from board$', '',
      '从公告板读取了 {1} 条消息', '從佈告欄讀取了 {1} 則訊息', 'ボードから {1} 件のメッセージを読み込みました', '보드에서 메시지 {1}개 읽음',
      'Leyó {1} mensaje(s) del tablero', '{1} message(s) lu(s) depuis le tableau', '{1} Nachricht(en) aus dem Board gelesen',
      'Прочитано сообщений с доски: {1}', 'Leu {1} mensagem(ns) do quadro',
    ],
    [
      '^Killed worker ([^\\n]{1,60})$', '',
      '已终止执行节点 {1}', '已終止執行節點 {1}', 'ワーカー {1} を強制終了しました', '워커 {1} 종료됨',
      'Trabajador {1} terminado', 'Agent travailleur {1} interrompu', 'Arbeiter {1} beendet',
      'Исполнитель {1} принудительно завершён', 'Trabalhador {1} encerrado',
    ],
    [
      '^Waiting for terminal authorization([.…]*)$', '',
      '等待终端授权{1}', '等待終端機授權{1}', 'ターミナルの承認待ち{1}', '터미널 승인 대기 중{1}',
      'Esperando autorización de terminal{1}', 'En attente d’autorisation du terminal{1}', 'Wartet auf Terminal-Autorisierung{1}',
      'Ожидание авторизации терминала{1}', 'Aguardando autorização do terminal{1}',
    ],
    [
      '^(\\d+)\\s*/\\s*(\\d+) steps?$', '',
      '{1} / {2} 步', '{1} / {2} 步', '{1} / {2} ステップ', '{1} / {2}단계',
      '{1} / {2} paso(s)', '{1} / {2} étape(s)', '{1} / {2} Schritt(e)',
      '{1} / {2} шаг(ов)', '{1} / {2} etapa(s)',
    ],
    [
      '^Resets in\\s+(.+)$', '',
      '{1} 后重置', '{1} 後重設', '{1} 後にリセット', '{1} 후 초기화',
      'Se restablece en {1}', 'Réinitialisation dans {1}', 'Zurücksetzung in {1}',
      'Сброс через {1}', 'Reinicia em {1}',
    ],
    [
      '^(\\d+)\\s*(?:s|sec|secs|seconds?)\\s+ago$', 'i',
      '{1} 秒前', '{1} 秒前', '{1} 秒前', '{1}초 전',
      'Hace {1} s', 'Il y a {1} s', 'Vor {1} Sek.',
      '{1} сек. назад', 'Há {1} s',
    ],
    [
      '^(\\d+)\\s*(?:m|min|mins|minutes?)\\s+ago$', 'i',
      '{1} 分钟前', '{1} 分鐘前', '{1} 分前', '{1}분 전',
      'Hace {1} min', 'Il y a {1} min', 'Vor {1} Min.',
      '{1} мин. назад', 'Há {1} min',
    ],
    [
      '^(\\d+)\\s*(?:h|hr|hrs|hours?)\\s+ago$', 'i',
      '{1} 小时前', '{1} 小時前', '{1} 時間前', '{1}시간 전',
      'Hace {1} h', 'Il y a {1} h', 'Vor {1} Std.',
      '{1} ч. назад', 'Há {1} h',
    ],
    [
      '^(\\d+)\\s*(?:d|days?)\\s+ago$', 'i',
      '{1} 天前', '{1} 天前', '{1} 日前', '{1}일 전',
      'Hace {1} d', 'Il y a {1} j', 'Vor {1} T.',
      '{1} дн. назад', 'Há {1} d',
    ],
    [
      '^(\\d+)\\s*(?:w|wk|wks|weeks?)\\s+ago$', 'i',
      '{1} 周前', '{1} 週前', '{1} 週間前', '{1}주 전',
      'Hace {1} sem.', 'Il y a {1} sem.', 'Vor {1} Wo.',
      '{1} нед. назад', 'Há {1} sem.',
    ],
    [
      '^Showing\\s+(\\d+)\\s+of\\s+(\\d+)$', '',
      '显示 {1} / {2}', '顯示 {1} / {2}', '{2} 件中 {1} 件を表示', '{2}개 중 {1}개 표시',
      'Mostrando {1} de {2}', 'Affichage de {1} sur {2}', '{1} von {2} angezeigt',
      'Показано {1} из {2}', 'Exibindo {1} de {2}',
    ],
    [
      '^Step\\s+(\\d+)\\s+of\\s+(\\d+)$', '',
      '第 {1} / {2} 步', '第 {1} / {2} 步', 'ステップ {1} / {2}', '{2}단계 중 {1}단계',
      'Paso {1} de {2}', 'Étape {1} sur {2}', 'Schritt {1} von {2}',
      'Шаг {1} из {2}', 'Etapa {1} de {2}',
    ],
    [
      '^(\\d+)\\s+conversations?$', '',
      '{1} 个对话', '{1} 個對話', '{1} 件の会話', '대화 {1}개',
      '{1} conversación(es)', '{1} conversation(s)', '{1} Unterhaltung(en)',
      'Диалогов: {1}', '{1} conversa(s)',
    ],
    [
      '^(\\d+)\\s+selected$', '',
      '已选 {1} 项', '已選取 {1} 項', '{1} 件を選択中', '{1}개 선택됨',
      '{1} seleccionado(s)', '{1} sélectionné(s)', '{1} ausgewählt',
      'Выбрано: {1}', '{1} selecionado(s)',
    ],
    [
      '^(\\d+)\\s+results?$', '',
      '{1} 条结果', '{1} 筆結果', '{1} 件の結果', '결과 {1}개',
      '{1} resultado(s)', '{1} résultat(s)', '{1} Ergebnis(se)',
      'Результатов: {1}', '{1} resultado(s)',
    ],
    [
      '^(\\d+)\\s+matches?$', '',
      '{1} 处匹配', '{1} 處相符', '{1} 件の一致', '일치 항목 {1}개',
      '{1} coincidencia(s)', '{1} correspondance(s)', '{1} Treffer',
      'Совпадений: {1}', '{1} correspondência(s)',
    ],
    [
      '^(\\d+)\\s+warnings?$', '',
      '{1} 条警告', '{1} 則警告', '{1} 件の警告', '경고 {1}개',
      '{1} advertencia(s)', '{1} avertissement(s)', '{1} Warnung(en)',
      'Предупреждений: {1}', '{1} aviso(s)',
    ],
    [
      '^(\\d+)\\s+errors?$', '',
      '{1} 个错误', '{1} 個錯誤', '{1} 件のエラー', '오류 {1}개',
      '{1} error(es)', '{1} erreur(s)', '{1} Fehler',
      'Ошибок: {1}', '{1} erro(s)',
    ],
    [
      '^(\\d+)\\s+tools?$', '',
      '{1} 个工具', '{1} 個工具', '{1} 個のツール', '도구 {1}개',
      '{1} herramienta(s)', '{1} outil(s)', '{1} Werkzeug(e)',
      'Инструментов: {1}', '{1} ferramenta(s)',
    ],
    [
      '^(\\d+)\\s+plugins?$', '',
      '{1} 个插件', '{1} 個外掛程式', '{1} 個のプラグイン', '플러그인 {1}개',
      '{1} complemento(s)', '{1} greffon(s)', '{1} Plugin(s)',
      'Плагинов: {1}', '{1} extensão(ões)',
    ],
    [
      '^(\\d+)\\s+messages?$', '',
      '{1} 条消息', '{1} 則訊息', '{1} 件のメッセージ', '메시지 {1}개',
      '{1} mensaje(s)', '{1} message(s)', '{1} Nachricht(en)',
      'Сообщений: {1}', '{1} mensagem(ns)',
    ],
    [
      '^(\\d+)\\s+items?$', '',
      '{1} 项', '{1} 個項目', '{1} 件', '항목 {1}개',
      '{1} elemento(s)', '{1} élément(s)', '{1} Element(e)',
      'Элементов: {1}', '{1} item(ns)',
    ],
    [
      '^(\\d+)\\s+lines?\\s+changed$', '',
      '{1} 行已更改', '{1} 行已變更', '{1} 行を変更', '{1}줄 변경됨',
      '{1} línea(s) modificada(s)', '{1} ligne(s) modifiée(s)', '{1} Zeile(n) geändert',
      'Изменено строк: {1}', '{1} linha(s) alterada(s)',
    ],
    [
      '^Updated\\s+(.+)$', '',
      '更新于 {1}', '更新於 {1}', '{1} に更新', '{1}에 업데이트됨',
      'Actualizado: {1}', 'Mis à jour : {1}', 'Aktualisiert: {1}',
      'Обновлено: {1}', 'Atualizado: {1}',
    ],
    [
      '^Version\\s+(.+)$', '',
      '版本 {1}', '版本 {1}', 'バージョン {1}', '버전 {1}',
      'Versión {1}', 'Version {1}', 'Version {1}',
      'Версия {1}', 'Versão {1}',
    ],
    [
      '^(\\d+)\\s+of\\s+(\\d+)\\s+completed$', '',
      '已完成 {1} / {2}', '已完成 {1} / {2}', '{2} 件中 {1} 件完了', '{2}개 중 {1}개 완료',
      '{1} de {2} completado(s)', '{1} sur {2} terminé(s)', '{1} von {2} abgeschlossen',
      'Выполнено {1} из {2}', '{1} de {2} concluído(s)',
    ],
  ];

  // Build immutable built-in packs once at module load.
  const BUILTIN_PACKS = {};
  for (const loc of LOCALES) {
    BUILTIN_PACKS[loc] = {
      meta: META[loc],
      exact: {},
      patterns: [],
    };
  }

  for (const row of EXACT_ROWS) {
    const enKey = row[0];
    if (!enKey || KEEP_SET.has(enKey)) continue;
    for (let i = 0; i < TARGET_LOCALES.length; i++) {
      const loc = TARGET_LOCALES[i];
      const val = row[i + 1];
      if (typeof val === 'string' && val.trim().length > 0) {
        BUILTIN_PACKS[loc].exact[enKey] = val;
      }
    }
  }

  for (const row of PATTERN_ROWS) {
    const source = row[0];
    const flags = row[1] || '';
    for (let i = 0; i < TARGET_LOCALES.length; i++) {
      const loc = TARGET_LOCALES[i];
      const replace = row[i + 2];
      if (typeof replace === 'string' && replace.trim().length > 0) {
        BUILTIN_PACKS[loc].patterns.push(Object.freeze({ source, flags, replace }));
      }
    }
  }

  for (const loc of LOCALES) {
    Object.freeze(BUILTIN_PACKS[loc].exact);
    Object.freeze(BUILTIN_PACKS[loc].patterns);
    Object.freeze(BUILTIN_PACKS[loc]);
  }
  Object.freeze(BUILTIN_PACKS);

  function normalizeHostLocale(raw) {
    const s = String(raw || '').trim().toLowerCase().replace(/_/g, '-');
    if (!s) return 'en';
    if (s === 'en' || s.startsWith('en-')) return 'en';
    if (/^zh-(?:tw|hk|mo|hant)/.test(s) || /^yue\b/.test(s)) return 'zh-TW';
    if (s === 'zh' || /^zh-(?:cn|sg|hans)/.test(s) || s.startsWith('zh-')) return 'zh-CN';
    if (s === 'ja' || s.startsWith('ja-') || s === 'jp' || s.startsWith('jp-')) return 'ja';
    if (s === 'ko' || s.startsWith('ko-') || s === 'kr' || s.startsWith('kr-')) return 'ko';
    if (s === 'es' || s.startsWith('es-')) return 'es';
    if (s === 'fr' || s.startsWith('fr-')) return 'fr';
    if (s === 'de' || s.startsWith('de-')) return 'de';
    if (s === 'ru' || s.startsWith('ru-')) return 'ru';
    if (s === 'pt' || s.startsWith('pt-')) return 'pt-BR';
    return 'en';
  }

  function listLocales() {
    return LOCALES.map((loc) => ({ ...META[loc] }));
  }

  const EXTENDED_PACKS = new Map();

  function clonePack(pack) {
    return {
      meta: { ...pack.meta },
      exact: { ...pack.exact },
      patterns: pack.patterns.map((p) => ({
        source: p.source instanceof RegExp ? p.source.source : String(p.source),
        flags: p.source instanceof RegExp ? p.source.flags : String(p.flags || ''),
        replace: String(p.replace),
      })),
    };
  }

  function registerExtendedPack(locale, extPack) {
    const norm = normalizeHostLocale(locale);
    if (norm === 'en' || !extPack || typeof extPack !== 'object') {
      return { ok: false, locale: norm, exactCount: 0, patternCount: 0 };
    }
    const cleanExact = Object.create(null);
    if (extPack.exact && typeof extPack.exact === 'object' && !Array.isArray(extPack.exact)) {
      for (const [k, v] of Object.entries(extPack.exact)) {
        if (typeof k !== 'string' || !k.trim()) continue;
        if (KEEP_SET.has(k) || KEEP_SET.has(k.trim())) continue;
        if (typeof v !== 'string' || !v.trim()) continue;
        cleanExact[k] = v;
      }
    }
    const cleanPatterns = [];
    if (Array.isArray(extPack.patterns)) {
      for (const item of extPack.patterns) {
        const clean = sanitizePatternEntry(item);
        if (clean) cleanPatterns.push(clean);
      }
    }
    EXTENDED_PACKS.set(norm, {
      meta: extPack.meta && typeof extPack.meta === 'object' ? { ...extPack.meta, locale: norm } : { locale: norm, schemaVersion: SCHEMA_VERSION },
      exact: cleanExact,
      patterns: cleanPatterns,
    });
    return {
      ok: true,
      locale: norm,
      exactCount: Object.keys(cleanExact).length,
      patternCount: cleanPatterns.length,
    };
  }

  function hasExtendedPack(locale) {
    const norm = normalizeHostLocale(locale);
    return EXTENDED_PACKS.has(norm);
  }

  function clearExtendedPacks(locale) {
    if (locale) {
      EXTENDED_PACKS.delete(normalizeHostLocale(locale));
    } else {
      EXTENDED_PACKS.clear();
    }
  }

  function getPack(locale) {
    const norm = normalizeHostLocale(locale);
    const core = BUILTIN_PACKS[norm] || BUILTIN_PACKS.en;
    const ext = norm !== 'en' ? EXTENDED_PACKS.get(norm) : null;
    if (!ext) return clonePack(core);

    // Priority: built-in 465 core > extended pack (custom pack overlays above this in mergeCustomPack)
    const mergedExact = { ...ext.exact, ...core.exact };
    const seenSources = new Set((core.patterns || []).map((p) => (p.source instanceof RegExp ? p.source.source : String(p.source))));
    const mergedPatterns = (core.patterns || []).map((p) => ({
      source: p.source instanceof RegExp ? p.source.source : String(p.source),
      flags: p.source instanceof RegExp ? p.source.flags : String(p.flags || ''),
      replace: String(p.replace),
    }));
    for (const p of ext.patterns || []) {
      if (!seenSources.has(p.source)) {
        seenSources.add(p.source);
        mergedPatterns.push({ ...p });
      }
    }
    return {
      meta: { ...core.meta, extendedCount: Object.keys(ext.exact).length + ext.patterns.length },
      exact: mergedExact,
      patterns: mergedPatterns,
    };
  }

  function sanitizePatternEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;
    if (typeof entry.replace !== 'string' || !entry.replace.trim()) return null;
    let source = '';
    let flags = '';
    if (entry.source instanceof RegExp) {
      source = entry.source.source;
      flags = entry.source.flags;
    } else if (typeof entry.source === 'string' && entry.source.trim()) {
      source = entry.source;
      flags = typeof entry.flags === 'string' ? entry.flags : '';
    } else {
      return null;
    }
    // Strip stateful global/sticky flags so compiled regexes stay pure and reusable
    flags = flags.replace(/[gy]/g, '');
    try {
      // Validate compilability
      new RegExp(source, flags);
    } catch {
      return null;
    }
    return { source, flags, replace: entry.replace };
  }

  function mergeCustomPack(locale, customPack) {
    const norm = normalizeHostLocale(locale);
    const base = getPack(norm);
    if (!customPack || typeof customPack !== 'object') return base;

    if (customPack.exact && typeof customPack.exact === 'object' && !Array.isArray(customPack.exact)) {
      for (const [k, v] of Object.entries(customPack.exact)) {
        if (typeof k !== 'string' || !k.trim()) continue;
        if (KEEP_SET.has(k) || KEEP_SET.has(k.trim())) continue;
        if (typeof v !== 'string' || !v.trim()) continue;
        base.exact[k] = v;
      }
    }

    if (Array.isArray(customPack.patterns)) {
      const customPatterns = [];
      for (const item of customPack.patterns) {
        const clean = sanitizePatternEntry(item);
        if (clean) customPatterns.push(clean);
      }
      if (customPatterns.length > 0) {
        // Custom patterns take precedence over built-in patterns
        base.patterns = [...customPatterns, ...base.patterns];
      }
    }

    return base;
  }

  function countCapturingGroups(regexSource) {
    try {
      const probe = new RegExp(String(regexSource) + '|');
      const m = probe.exec('');
      return m ? Math.max(0, m.length - 1) : 0;
    } catch {
      return -1;
    }
  }

  const MAX_IMPORT_JSON_BYTES = 256 * 1024;
  const MAX_IMPORT_EXACT = 2000;
  const MAX_IMPORT_EXACT_STR = 500;
  const MAX_IMPORT_PATTERNS = 50;
  const MAX_IMPORT_PATTERN_SRC = 200;
  const MAX_IMPORT_PATTERN_REPLACE = 500;
  const NESTED_QUANTIFIER_RE = /\((?:[^()\\]|\\.)*[+*}|?](?:[^()\\]|\\.)*\)\s*[+*{]/;
  const BACKREFERENCE_RE = /(?:^|[^\\])(?:\\\\)*\\(?:[1-9]|k<[^>]+>)/;
  const DISALLOWED_PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype', 'toString', 'valueOf', 'hasOwnProperty']);

  function utf8ByteLength(str) {
    const s = String(str ?? '');
    if (typeof TextEncoder === 'function') {
      return new TextEncoder().encode(s).length;
    }
    if (typeof Buffer === 'function') {
      return Buffer.byteLength(s, 'utf8');
    }
    return s.length * 3;
  }

  function hasNestedQuantifierLinear(source) {
    if (NESTED_QUANTIFIER_RE.test(source)) return true;
    // O(N) bracket-depth scanner to catch nested groups like ((a+))+ or (?:a+(b*))+
    const stack = [];
    let inClass = false;
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (inClass) {
        if (ch === ']') inClass = false;
        continue;
      }
      if (ch === '[') {
        inClass = true;
        continue;
      }
      if (ch === '(') {
        stack.push(false);
        continue;
      }
      if (ch === ')') {
        const hadInnerQuantifier = stack.length > 0 ? stack.pop() : false;
        if (hadInnerQuantifier) {
          let j = i + 1;
          while (j < source.length && /\s/.test(source[j])) j += 1;
          const next = source[j];
          if (next === '+' || next === '*' || next === '{') {
            return true;
          }
          if (stack.length > 0) stack[stack.length - 1] = true;
        }
        continue;
      }
      if (stack.length > 0) {
        if (ch === '+' || ch === '*' || ch === '?' || ch === '|') {
          stack[stack.length - 1] = true;
        } else if (ch === '{' && /^\{\d+(?:,\d*)?\}/.test(source.slice(i))) {
          stack[stack.length - 1] = true;
        }
      }
    }
    return false;
  }

  function sanitizeImportedPack(raw) {
    const errors = [];
    const emptyPack = { locale: '', exact: {}, patterns: [] };
    const fail = (extraStats = {}) => ({
      ok: false,
      pack: emptyPack,
      errors,
      stats: { exactCount: 0, patternCount: 0, droppedNonString: 0, ...extraStats },
    });

    let obj = null;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) {
        errors.push('JSON input is empty');
        return fail();
      }
      if (utf8ByteLength(raw) > MAX_IMPORT_JSON_BYTES) {
        errors.push(`JSON exceeds ${MAX_IMPORT_JSON_BYTES} bytes (256 KB) limit`);
        return fail();
      }
      try {
        obj = JSON.parse(trimmed);
      } catch (e) {
        errors.push(`Invalid JSON: ${e?.message || 'parse error'}`);
        return fail();
      }
    } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      let serialized = '';
      try {
        serialized = JSON.stringify(raw);
      } catch {
        errors.push('Pack object is not JSON-serializable');
        return fail();
      }
      if (utf8ByteLength(serialized) > MAX_IMPORT_JSON_BYTES) {
        errors.push(`Pack exceeds ${MAX_IMPORT_JSON_BYTES} bytes (256 KB) limit`);
        return fail();
      }
      obj = raw;
    } else {
      errors.push('Pack must be a JSON string or plain object');
      return fail();
    }

    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      errors.push('Pack root must be a JSON object');
      return fail();
    }

    const rawLocale = obj.locale ?? obj.meta?.locale;
    if (typeof rawLocale !== 'string' || !rawLocale.trim()) {
      errors.push('Missing target locale');
      return fail();
    }
    const locale = normalizeHostLocale(rawLocale);
    if (locale === 'en') {
      errors.push(`Unsupported or source locale "${String(rawLocale).slice(0, 32)}"`);
      return fail();
    }

    const exact = {};
    let droppedNonString = 0;
    if (obj.exact !== undefined) {
      if (!obj.exact || typeof obj.exact !== 'object' || Array.isArray(obj.exact)) {
        errors.push('exact must be a plain object');
        return fail();
      }
      const entries = Object.entries(obj.exact);
      if (entries.length > MAX_IMPORT_EXACT) {
        errors.push(`exact exceeds ${MAX_IMPORT_EXACT} entries limit (${entries.length})`);
        return fail();
      }
      for (const [k, v] of entries) {
        if (typeof k !== 'string' || typeof v !== 'string') {
          droppedNonString += 1;
          continue;
        }
        if (DISALLOWED_PROTO_KEYS.has(k)) {
          continue;
        }
        if (k.length > MAX_IMPORT_EXACT_STR || v.length > MAX_IMPORT_EXACT_STR) {
          errors.push(`exact entry exceeds ${MAX_IMPORT_EXACT_STR} chars limit`);
          return fail({ droppedNonString });
        }
        const tk = k.trim();
        const tv = v.trim();
        if (!tk || !tv) continue;
        if (KEEP_SET.has(k) || KEEP_SET.has(tk)) continue;
        exact[k] = v;
      }
    }

    const patterns = [];
    if (obj.patterns !== undefined) {
      if (!Array.isArray(obj.patterns)) {
        errors.push('patterns must be an array');
        return fail({ droppedNonString });
      }
      if (obj.patterns.length > MAX_IMPORT_PATTERNS) {
        errors.push(`patterns exceeds ${MAX_IMPORT_PATTERNS} entries limit (${obj.patterns.length})`);
        return fail({ droppedNonString });
      }
      for (let i = 0; i < obj.patterns.length; i++) {
        const item = obj.patterns[i];
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          errors.push(`patterns[${i}] must be an object`);
          return fail({ droppedNonString });
        }
        const rawSrc = item.source instanceof RegExp ? item.source.source : item.source;
        if (typeof rawSrc !== 'string' || !rawSrc.trim()) {
          errors.push(`patterns[${i}].source must be a non-empty string`);
          return fail({ droppedNonString });
        }
        if (rawSrc.length > MAX_IMPORT_PATTERN_SRC) {
          errors.push(`patterns[${i}].source exceeds ${MAX_IMPORT_PATTERN_SRC} chars limit`);
          return fail({ droppedNonString });
        }
        if (BACKREFERENCE_RE.test(rawSrc)) {
          errors.push(`patterns[${i}].source contains disallowed backreference`);
          return fail({ droppedNonString });
        }
        if (hasNestedQuantifierLinear(rawSrc)) {
          errors.push(`patterns[${i}].source contains unsafe nested quantifier`);
          return fail({ droppedNonString });
        }
        if (typeof item.replace !== 'string' || item.replace.length > MAX_IMPORT_PATTERN_REPLACE) {
          errors.push(`patterns[${i}].replace exceeds ${MAX_IMPORT_PATTERN_REPLACE} chars limit`);
          return fail({ droppedNonString });
        }
        const clean = sanitizePatternEntry(item);
        if (!clean) {
          errors.push(`patterns[${i}] is invalid or missing replace`);
          return fail({ droppedNonString });
        }
        patterns.push(clean);
      }
    }

    return {
      ok: true,
      pack: { locale, exact, patterns },
      errors: [],
      stats: {
        exactCount: Object.keys(exact).length,
        patternCount: patterns.length,
        droppedNonString,
      },
    };
  }

  function validatePacks(packsMap) {
    const sourcePacks = packsMap || BUILTIN_PACKS;
    const errors = [];
    const stats = {
      localeCount: 0,
      locales: {},
    };

    for (const loc of LOCALES) {
      const pack = sourcePacks[loc];
      if (!pack || typeof pack !== 'object') {
        errors.push(`Missing pack for locale "${loc}"`);
        continue;
      }
      stats.localeCount += 1;

      const meta = pack.meta;
      if (!meta || typeof meta !== 'object') {
        errors.push(`[${loc}] Missing meta object`);
      } else {
        if (meta.locale !== loc) errors.push(`[${loc}] meta.locale mismatch: got "${meta.locale}"`);
        if (typeof meta.nativeName !== 'string' || !meta.nativeName.trim()) errors.push(`[${loc}] Missing meta.nativeName`);
        if (typeof meta.englishName !== 'string' || !meta.englishName.trim()) errors.push(`[${loc}] Missing meta.englishName`);
        if (meta.schemaVersion !== SCHEMA_VERSION) errors.push(`[${loc}] meta.schemaVersion must be ${SCHEMA_VERSION}`);
      }

      const exact = pack.exact;
      const patterns = pack.patterns;
      let exactCount = 0;
      let distinctCount = 0;
      let patternCount = 0;

      if (!exact || typeof exact !== 'object' || Array.isArray(exact)) {
        errors.push(`[${loc}] exact must be a plain object`);
      } else {
        const entries = Object.entries(exact);
        exactCount = entries.length;
        for (const [k, v] of entries) {
          if (!k || !k.trim()) {
            errors.push(`[${loc}] exact contains empty key`);
            continue;
          }
          if (KEEP_SET.has(k) || KEEP_SET.has(k.trim())) {
            errors.push(`[${loc}] exact key "${k}" conflicts with KEEP_UNTRANSLATED_EXACT`);
          }
          if (typeof v !== 'string' || !v.trim()) {
            errors.push(`[${loc}] exact["${k}"] must be a non-empty string`);
            continue;
          }
          if (v.trim() !== k.trim()) {
            distinctCount += 1;
          }
        }

        if (loc === 'zh-CN' && exactCount < 280) {
          errors.push(`[zh-CN] exact count ${exactCount} is below minimum 280`);
        } else if (loc !== 'en' && exactCount < 180) {
          errors.push(`[${loc}] exact count ${exactCount} is below minimum 180`);
        }

        if (loc !== 'en' && exactCount > 0) {
          const ratio = distinctCount / exactCount;
          if (ratio < 0.85) {
            errors.push(`[${loc}] distinct translation ratio ${(ratio * 100).toFixed(1)}% is below 85%`);
          }
        }
      }

      if (!Array.isArray(patterns)) {
        errors.push(`[${loc}] patterns must be an array`);
      } else {
        patternCount = patterns.length;
        if (loc !== 'en' && patternCount < 18) {
          errors.push(`[${loc}] pattern count ${patternCount} is below minimum 18`);
        }
        for (let i = 0; i < patterns.length; i++) {
          const p = patterns[i];
          if (!p || typeof p !== 'object') {
            errors.push(`[${loc}] patterns[${i}] must be an object`);
            continue;
          }
          const src = p.source instanceof RegExp ? p.source.source : p.source;
          const flg = p.source instanceof RegExp ? p.source.flags : (p.flags || '');
          if (typeof src !== 'string' || !src.trim()) {
            errors.push(`[${loc}] patterns[${i}].source must be a non-empty string or RegExp`);
            continue;
          }
          if (typeof p.replace !== 'string' || !p.replace.trim()) {
            errors.push(`[${loc}] patterns[${i}].replace must be a non-empty string`);
            continue;
          }
          try {
            new RegExp(src, flg);
          } catch (e) {
            errors.push(`[${loc}] patterns[${i}] invalid RegExp "${src}": ${e.message}`);
            continue;
          }
          const groupCount = countCapturingGroups(src);
          const placeholderRe = /\{(\d+)\}/g;
          let m;
          let foundPlaceholder = false;
          while ((m = placeholderRe.exec(p.replace)) !== null) {
            foundPlaceholder = true;
            const idx = Number(m[1]);
            if (idx < 1 || idx > groupCount) {
              errors.push(`[${loc}] patterns[${i}] placeholder {${idx}} out of range (groups=${groupCount})`);
            }
          }
          if (groupCount > 0 && !foundPlaceholder) {
            errors.push(`[${loc}] patterns[${i}] regex has ${groupCount} group(s) but replace uses no {N} placeholder`);
          }
        }
      }

      stats.locales[loc] = {
        exactCount,
        distinctCount,
        patternCount,
      };
    }

    return {
      ok: errors.length === 0,
      errors,
      stats,
    };
  }

  return {
    LOCALES,
    KEEP_UNTRANSLATED_EXACT,
    normalizeHostLocale,
    listLocales,
    getPack,
    registerExtendedPack,
    hasExtendedPack,
    clearExtendedPacks,
    mergeCustomPack,
    sanitizeImportedPack,
    sanitizePatternEntry,
    countCapturingGroups,
    validatePacks,
  };
});
