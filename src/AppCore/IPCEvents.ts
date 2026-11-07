/* Copyright Elysia © 2025. All rights reserved */

export const enum IPCEvent {
    Close = "app:window:close",
    Minimize = "app:window:minimize",
    Maximize = "app:window:maximize",
    Focus = "app:window:focus",
    FlashFrame = "app:window:flash_frame",
    RequestCloseWindow = "app:request_close_window",
    // Preload IPC Events
    GetBotInfo = "app:preload:get_bot_info",
    GetVersion = "app:preload:get_version",
    GetName = "app:preload:get_name",
    GetExperiment = "app:preload:get_experiment",
    GetDefaultUserPatch = "app:preload:get_default_user_patch",
    GetIsUserToken = "app:preload:get_is_user_token",
    // Game detection
    RunningGamesChanged = "app:games:changed",
    GetRunningGames = "app:games:get",
    // Logging from Main Process
    LogFromMainProcess = "app:main:log",
    // Main > Renderer Events
    GetPreloadedUserSettings = "app:preload:get_preloaded_user_settings",
    GetPreloadedUserSettingsResponse = "app:preload:get_preloaded_user_settings_response",
    SetPreloadedUserSettings = "app:preload:set_preloaded_user_settings",

    GetFrecencyUserSettings = "app:preload:get_frecency_user_settings",
    GetFrecencyUserSettingsResponse = "app:preload:get_frecency_user_settings_response",
    SetFrecencyUserSettings = "app:preload:set_frecency_user_settings",
    // User Account Login (email + password)
    OpenAccountLoginWindow = "app:account:open_window",
    AccountLogin = "app:account:login",
    AccountMfa = "app:account:mfa",
    AccountSendSms = "app:account:send_sms",
    AccountSolveCaptcha = "app:account:solve_captcha",
    AccountCaptchaResult = "app:account:captcha_result",
    AccountList = "app:account:list",
    AccountRemove = "app:account:remove",
    AccountUse = "app:account:use",
    AccountOpenWindow = "app:account:open_client_window",
    RememberBot = "app:account:remember_bot",
    GetBotAccountIds = "app:account:bot_ids",
    GetAccountTokens = "app:account:tokens",
    OpenSettings = "app:settings:open",
    GetSettings = "app:settings:get",
    SaveSettings = "app:settings:save",
    GetLangue = "app:langue",
    GetSupportInvite = "app:support_invite",
    SupportInviteCopied = "app:support_invite:copied",
    // Updates
    UpdateCheck = "app:update:check",
    UpdateState = "app:update:state",
    UpdateGetState = "app:update:get_state",
    UpdateInstall = "app:update:install",
    // Screen share picker
    OpenInvite = "app:invite:open",
    PickerSources = "app:picker:sources",
    PickerChoose = "app:picker:choose",
    AccountTokenLogin = "app:account:token_login",
    // Beta Features
    RequestOpenMessageEditorWindow = "app:request_open_message_editor_window",
    MessageEditorReactReady = "app:message_editor_ready",
    MessageEditorClose = "app:message_editor_close",
    MessageEditorReceivePort = "app:message_editor_receive_port",
    MainAppReceiveEditorPort = "app:main_receive_editor_port",
}
