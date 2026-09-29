using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

/// <summary>
/// SAFEX AR Safety Command Center - Cloud & Offline Sync Manager
/// Connects Unity Android AR Training to the Node.js/PostgreSQL Backend.
/// Handles offline queueing, automatic background retries, and Santali/Hindi/English language metadata.
/// </summary>
public class SAFEXCloudSyncManager : MonoBehaviour
{
    public static SAFEXCloudSyncManager Instance { get; private set; }

    [Header("Backend API Configuration")]
    [Tooltip("API Base URL (e.g., http://10.0.2.2:5000/api for emulator, http://YOUR-IP:5000/api for device, or your production URL)")]
    [SerializeField]
    private string apiBaseUrl = "http://10.0.2.2:5000/api";

    [Tooltip("Security API Key sent in X-SAFEX-API-KEY header")]
    [SerializeField]
    private string apiKey = "SAFEX-AR-SAFETY-KEY-2026";

    [Header("Language & Device Identity")]
    [Tooltip("Active trainee language: 'sat' (Santali), 'hi' (Hindi), 'en' (English)")]
    [SerializeField]
    private string currentLanguage = "sat";

    [Header("Offline Sync Settings")]
    [SerializeField]
    private float retryIntervalSeconds = 12f;

    [SerializeField]
    private bool logDebugMessages = true;

    // Standard Event Type Constants
    public const string EVENT_SURFACE_DETECTED = "SURFACE_DETECTED";
    public const string EVENT_MINE_PLACED = "MINE_PLACED";
    public const string EVENT_TRAINING_STARTED = "TRAINING_STARTED";
    public const string EVENT_REACH_POWER_CONTROL = "REACH_POWER_CONTROL";
    public const string EVENT_ISOLATE_POWER = "ISOLATE_POWER";
    public const string EVENT_USE_FIRE_EXTINGUISHER = "USE_FIRE_EXTINGUISHER";
    public const string EVENT_RAISE_ALARM = "RAISE_ALARM";
    public const string EVENT_REACH_GAS_DETECTOR = "REACH_GAS_DETECTOR";
    public const string EVENT_SELECT_CORRECT_GAS_PPE = "SELECT_CORRECT_GAS_PPE";
    public const string EVENT_BUDDY_CONFIRMED = "BUDDY_CONFIRMED";
    public const string EVENT_ISOLATE_CONTAMINATED_AREA = "ISOLATE_CONTAMINATED_AREA";
    public const string EVENT_EVACUATE_SAFE_EXIT = "EVACUATE_SAFE_EXIT";
    public const string EVENT_TRAINING_COMPLETED = "TRAINING_COMPLETED";

    // Offline Queue structures
    [Serializable]
    public class SyncQueueItem
    {
        public string id;
        public string endpoint;
        public string httpMethod; // POST, PATCH
        public string jsonBody;
        public string timestamp;
        public int retryCount;
    }

    [Serializable]
    private class SyncQueueWrapper
    {
        public List<SyncQueueItem> items = new List<SyncQueueItem>();
    }

    private SyncQueueWrapper syncQueue = new SyncQueueWrapper();
    private string queueFilePath;
    private bool isSyncingQueue = false;
    private Coroutine retryLoopCoroutine;

    public string CurrentLanguage
    {
        get => currentLanguage;
        set => currentLanguage = string.IsNullOrEmpty(value) ? "sat" : value.ToLower();
    }

    public string ApiBaseUrl
    {
        get => apiBaseUrl;
        set => apiBaseUrl = value?.TrimEnd('/');
    }

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        DontDestroyOnLoad(gameObject);

        queueFilePath = Path.Combine(Application.persistentDataPath, "SAFEXSyncQueue.json");
        LoadQueueFromDisk();
    }

    private void Start()
    {
        if (retryLoopCoroutine == null)
        {
            retryLoopCoroutine = StartCoroutine(OfflineSyncWorker());
        }
    }

    #region Public Reusable Training APIs

    /// <summary>
    /// Register or update a trainee record on the command center.
    /// </summary>
    public void RegisterTrainee(string traineeId, string name, string language = null, string deviceId = null, Action<bool, string> onComplete = null)
    {
        string lang = string.IsNullOrEmpty(language) ? currentLanguage : language;
        string devId = string.IsNullOrEmpty(deviceId) ? SystemInfo.deviceUniqueIdentifier : deviceId;

        string json = JsonUtility.ToJson(new TraineePayload
        {
            traineeId = traineeId,
            name = name,
            language = lang,
            deviceId = devId
        });

        SendOrEnqueue("/trainees", "POST", json, onComplete);
    }

    /// <summary>
    /// Start a training session (Fire or Gas module).
    /// </summary>
    public void StartSession(string sessionId, string traineeId, string module, Action<bool, string> onComplete = null)
    {
        string json = JsonUtility.ToJson(new StartSessionPayload
        {
            sessionId = sessionId,
            traineeId = traineeId,
            module = module?.ToUpper(),
            startedAt = DateTime.UtcNow.ToString("o")
        });

        SendOrEnqueue("/sessions", "POST", json, onComplete);
    }

    /// <summary>
    /// Record an important training event (e.g. BUDDY_CONFIRMED, RAISE_ALARM).
    /// </summary>
    public void SendTrainingEvent(string sessionId, string eventType, string extraJsonData = null, Action<bool, string> onComplete = null)
    {
        // Construct event JSON
        string eventDataJson = string.IsNullOrEmpty(extraJsonData) ? "{}" : extraJsonData;
        string json = $"{{\"eventType\":\"{eventType}\",\"eventData\":{eventDataJson},\"timestamp\":\"{DateTime.UtcNow:o}\"}}";

        SendOrEnqueue($"/sessions/{sessionId}/events", "POST", json, onComplete);
    }

    /// <summary>
    /// Record assessment completion and scores.
    /// </summary>
    public void SendAssessment(string sessionId, string module, List<string> completedActions, float score, bool passed, int durationSeconds, Action<bool, string> onComplete = null)
    {
        AssessmentPayload payload = new AssessmentPayload
        {
            sessionId = sessionId,
            module = module?.ToUpper(),
            completedActions = completedActions ?? new List<string>(),
            score = score,
            passed = passed,
            durationSeconds = durationSeconds
        };

        string json = JsonUtility.ToJson(payload);
        SendOrEnqueue("/assessments", "POST", json, onComplete);
    }

    /// <summary>
    /// Issue and register certificate on backend.
    /// </summary>
    public void SendCertificate(string certificateId, string sessionId, string traineeId, string module, float score, float percentage, string status, Action<bool, string> onComplete = null)
    {
        if (string.IsNullOrEmpty(certificateId))
        {
            certificateId = GenerateCertificateId();
        }

        CertificatePayload payload = new CertificatePayload
        {
            certificateId = certificateId,
            sessionId = sessionId,
            traineeId = traineeId,
            module = module?.ToUpper(),
            score = score,
            percentage = percentage,
            status = string.IsNullOrEmpty(status) ? "PASSED" : status.ToUpper()
        };

        string json = JsonUtility.ToJson(payload);
        SendOrEnqueue("/certificates", "POST", json, onComplete);
    }

    /// <summary>
    /// Finalize training session with completed status, duration, and assessment result.
    /// </summary>
    public void CompleteSession(string sessionId, string status = "COMPLETED", int durationSeconds = 0, bool assessmentPassed = true, string completedAt = null, Action<bool, string> onComplete = null)
    {
        string timestamp = string.IsNullOrEmpty(completedAt) ? DateTime.UtcNow.ToString("o") : completedAt;

        CompleteSessionPayload payload = new CompleteSessionPayload
        {
            status = status,
            completedAt = timestamp,
            durationSeconds = durationSeconds,
            assessmentPassed = assessmentPassed
        };

        string json = JsonUtility.ToJson(payload);
        SendOrEnqueue($"/sessions/{sessionId}", "PATCH", json, onComplete);
    }

    /// <summary>
    /// Helper to generate standard SAFEX certificate ID: SAFEX-yyyyMMdd-######
    /// </summary>
    public string GenerateCertificateId(DateTime? date = null)
    {
        DateTime d = date ?? DateTime.UtcNow;
        int rand = UnityEngine.Random.Range(100000, 999999);
        return $"SAFEX-{d:yyyyMMdd}-{rand}";
    }

    /// <summary>
    /// Manually trigger retry of queued offline requests.
    /// </summary>
    public void TriggerSyncNow()
    {
        if (!isSyncingQueue && syncQueue.items.Count > 0)
        {
            StartCoroutine(ProcessOfflineQueue());
        }
    }

    #endregion

    #region Network & Offline Queue Engine

    private void SendOrEnqueue(string endpoint, string httpMethod, string jsonBody, Action<bool, string> onComplete)
    {
        // If device has no internet at all, enqueue immediately without waiting
        if (Application.internetReachability == NetworkReachability.NotReachable)
        {
            EnqueueOfflineRequest(endpoint, httpMethod, jsonBody);
            onComplete?.Invoke(false, "Offline: Enqueued to local storage");
            return;
        }

        StartCoroutine(SendRequestCoroutine(endpoint, httpMethod, jsonBody, onComplete));
    }

    private IEnumerator SendRequestCoroutine(string endpoint, string httpMethod, string jsonBody, Action<bool, string> onComplete)
    {
        string fullUrl = $"{apiBaseUrl.TrimEnd('/')}{endpoint}";
        using (UnityWebRequest req = new UnityWebRequest(fullUrl, httpMethod))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);
            req.uploadHandler = new UploadHandlerRaw(bodyRaw);
            req.downloadHandler = new DownloadHandlerBuffer();
            req.SetRequestHeader("Content-Type", "application/json");

            if (!string.IsNullOrEmpty(apiKey))
            {
                req.SetRequestHeader("X-SAFEX-API-KEY", apiKey);
            }

            req.timeout = 10; // 10 second timeout

            yield return req.SendWebRequest();

            bool isSuccess = req.result == UnityWebRequest.Result.Success;

            if (isSuccess)
            {
                if (logDebugMessages)
                {
                    Debug.Log($"[SAFEX CloudSync] Successfully synced: {httpMethod} {endpoint}");
                }
                onComplete?.Invoke(true, req.downloadHandler.text);
            }
            else
            {
                // Network failed - save to offline queue for automatic retry
                if (logDebugMessages)
                {
                    Debug.LogWarning($"[SAFEX CloudSync] Request failed ({req.error}). Enqueueing for offline sync: {endpoint}");
                }

                EnqueueOfflineRequest(endpoint, httpMethod, jsonBody);
                onComplete?.Invoke(false, req.error);
            }
        }
    }

    private void EnqueueOfflineRequest(string endpoint, string httpMethod, string jsonBody)
    {
        lock (syncQueue)
        {
            SyncQueueItem item = new SyncQueueItem
            {
                id = Guid.NewGuid().ToString(),
                endpoint = endpoint,
                httpMethod = httpMethod,
                jsonBody = jsonBody,
                timestamp = DateTime.UtcNow.ToString("o"),
                retryCount = 0
            };

            syncQueue.items.Add(item);
            SaveQueueToDisk();
        }

        if (logDebugMessages)
        {
            Debug.Log($"[SAFEX CloudSync] Saved offline request. Total pending: {syncQueue.items.Count}");
        }
    }

    private IEnumerator OfflineSyncWorker()
    {
        while (true)
        {
            yield return new WaitForSeconds(retryIntervalSeconds);

            if (Application.internetReachability != NetworkReachability.NotReachable && syncQueue.items.Count > 0 && !isSyncingQueue)
            {
                yield return StartCoroutine(ProcessOfflineQueue());
            }
        }
    }

    private IEnumerator ProcessOfflineQueue()
    {
        isSyncingQueue = true;

        if (logDebugMessages)
        {
            Debug.Log($"[SAFEX CloudSync] Attempting to sync {syncQueue.items.Count} queued offline requests...");
        }

        List<SyncQueueItem> itemsToProcess;
        lock (syncQueue)
        {
            itemsToProcess = new List<SyncQueueItem>(syncQueue.items);
        }

        List<string> successfulItemIds = new List<string>();

        foreach (var item in itemsToProcess)
        {
            if (Application.internetReachability == NetworkReachability.NotReachable)
            {
                break; // Internet lost again, pause processing
            }

            string fullUrl = $"{apiBaseUrl.TrimEnd('/')}{item.endpoint}";
            using (UnityWebRequest req = new UnityWebRequest(fullUrl, item.httpMethod))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(item.jsonBody);
                req.uploadHandler = new UploadHandlerRaw(bodyRaw);
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");

                if (!string.IsNullOrEmpty(apiKey))
                {
                    req.SetRequestHeader("X-SAFEX-API-KEY", apiKey);
                }

                req.timeout = 10;

                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    successfulItemIds.Add(item.id);
                    if (logDebugMessages)
                    {
                        Debug.Log($"[SAFEX CloudSync] Queued request synced: {item.endpoint}");
                    }
                }
                else
                {
                    item.retryCount++;
                    // Stop batch if network failed
                    break;
                }
            }
        }

        if (successfulItemIds.Count > 0)
        {
            lock (syncQueue)
            {
                syncQueue.items.RemoveAll(i => successfulItemIds.Contains(i.id));
                SaveQueueToDisk();
            }

            if (logDebugMessages)
            {
                Debug.Log($"[SAFEX CloudSync] Synced {successfulItemIds.Count} items. Remaining queued: {syncQueue.items.Count}");
            }
        }

        isSyncingQueue = false;
    }

    private void SaveQueueToDisk()
    {
        try
        {
            string json = JsonUtility.ToJson(syncQueue, true);
            File.WriteAllText(queueFilePath, json);
        }
        catch (Exception ex)
        {
            Debug.LogError($"[SAFEX CloudSync] Error saving offline queue: {ex.Message}");
        }
    }

    private void LoadQueueFromDisk()
    {
        try
        {
            if (File.Exists(queueFilePath))
            {
                string json = File.ReadAllText(queueFilePath);
                syncQueue = JsonUtility.FromJson<SyncQueueWrapper>(json) ?? new SyncQueueWrapper();
                if (logDebugMessages && syncQueue.items.Count > 0)
                {
                    Debug.Log($"[SAFEX CloudSync] Loaded {syncQueue.items.Count} pending items from {queueFilePath}");
                }
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"[SAFEX CloudSync] Error loading offline queue: {ex.Message}");
            syncQueue = new SyncQueueWrapper();
        }
    }

    #endregion

    #region Serializable Payloads

    [Serializable]
    private class TraineePayload
    {
        public string traineeId;
        public string name;
        public string language;
        public string deviceId;
    }

    [Serializable]
    private class StartSessionPayload
    {
        public string sessionId;
        public string traineeId;
        public string module;
        public string startedAt;
    }

    [Serializable]
    private class CompleteSessionPayload
    {
        public string status;
        public string completedAt;
        public int durationSeconds;
        public bool assessmentPassed;
    }

    [Serializable]
    private class AssessmentPayload
    {
        public string sessionId;
        public string module;
        public List<string> completedActions;
        public float score;
        public bool passed;
        public int durationSeconds;
    }

    [Serializable]
    private class CertificatePayload
    {
        public string certificateId;
        public string sessionId;
        public string traineeId;
        public string module;
        public float score;
        public float percentage;
        public string status;
    }

    #endregion
}
