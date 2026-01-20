# SAFe AI/ML - DETAILED SPECIFICATIONS

## FOLDER STRUCTURE

### AI/ML Service Monorepo
```
ai-services/
├── recommendation-engine/
│   ├── src/
│   │   ├── models/
│   │   │   ├── collaborative_filtering.py
│   │   │   ├── neural_cf.py
│   │   │   ├── session_based.py
│   │   │   └── hybrid.py
│   │   ├── features/
│   │   │   ├── user_features.py
│   │   │   ├── route_features.py
│   │   │   └── feature_engineering.py
│   │   ├── training/
│   │   │   ├── train.py
│   │   │   ├── evaluate.py
│   │   │   └── hyperparameter_tuning.py
│   │   ├── inference/
│   │   │   ├── api.py
│   │   │   ├── batch_predict.py
│   │   │   └── model_loader.py
│   │   ├── data/
│   │   │   ├── data_loader.py
│   │   │   ├── preprocessor.py
│   │   │   └── augmentation.py
│   │   ├── utils/
│   │   │   ├── logger.py
│   │   │   ├── metrics.py
│   │   │   └── config.py
│   │   └── tests/
│   ├── notebooks/
│   │   ├── 01_data_exploration.ipynb
│   │   ├── 02_feature_engineering.ipynb
│   │   ├── 03_model_experimentation.ipynb
│   │   └── 04_model_evaluation.ipynb
│   ├── data/
│   │   ├── raw/
│   │   ├── processed/
│   │   └── features/
│   ├── models/
│   │   ├── checkpoints/
│   │   ├── production/
│   │   └── archived/
│   ├── configs/
│   │   ├── model_config.yaml
│   │   ├── training_config.yaml
│   │   └── feature_config.yaml
│   ├── requirements.txt
│   ├── Dockerfile
│   └── README.md
├── chatbot-service/
│   ├── src/
│   │   ├── nlu/
│   │   │   ├── intent_classifier.py
│   │   │   ├── entity_extractor.py
│   │   │   └── embedding_model.py
│   │   ├── dialogue/
│   │   │   ├── state_machine.py
│   │   │   ├── context_manager.py
│   │   │   └── response_generator.py
│   │   ├── llm/
│   │   │   ├── openai_client.py
│   │   │   ├── prompt_templates.py
│   │   │   └── safety_filter.py
│   │   ├── api/
│   │   │   ├── chat_api.py
│   │   │   └── webhook_api.py
│   │   ├── training/
│   │   │   ├── train_intent.py
│   │   │   ├── train_ner.py
│   │   │   └── fine_tune_llm.py
│   │   ├── data/
│   │   │   ├── intents/
│   │   │   │   ├── search.json
│   │   │   │   ├── booking.json
│   │   │   │   └── cancellation.json
│   │   │   └── entities/
│   │   ├── utils/
│   │   └── tests/
│   ├── notebooks/
│   ├── configs/
│   ├── requirements.txt
│   └── Dockerfile
├── smart-pricing/
│   ├── src/
│   │   ├── forecasting/
│   │   │   ├── prophet_model.py
│   │   │   ├── lstm_model.py
│   │   │   └── ensemble.py
│   │   ├── optimization/
│   │   │   ├── price_optimizer.py
│   │   │   ├── rl_agent.py
│   │   │   └── constraint_solver.py
│   │   ├── features/
│   │   │   ├── demand_features.py
│   │   │   ├── competitor_features.py
│   │   │   └── seasonality_features.py
│   │   ├── api/
│   │   │   ├── pricing_api.py
│   │   │   └── forecast_api.py
│   │   ├── training/
│   │   ├── data/
│   │   ├── utils/
│   │   └── tests/
│   ├── notebooks/
│   ├── configs/
│   ├── requirements.txt
│   └── Dockerfile
├── fraud-detection/
│   ├── src/
│   │   ├── models/
│   │   │   ├── isolation_forest.py
│   │   │   ├── autoencoder.py
│   │   │   └── xgboost_classifier.py
│   │   ├── rules/
│   │   │   ├── velocity_check.py
│   │   │   ├── geo_check.py
│   │   │   └── blacklist.py
│   │   ├── features/
│   │   │   ├── transaction_features.py
│   │   │   └── user_behavior_features.py
│   │   ├── api/
│   │   │   ├── scoring_api.py
│   │   │   └── feedback_api.py
│   │   ├── training/
│   │   ├── data/
│   │   ├── utils/
│   │   └── tests/
│   ├── notebooks/
│   ├── configs/
│   ├── requirements.txt
│   └── Dockerfile
├── route-optimization/
│   ├── src/
│   │   ├── vrp/
│   │   │   ├── solver.py
│   │   │   ├── constraints.py
│   │   │   └── ortools_wrapper.py
│   │   ├── traffic/
│   │   │   ├── predictor.py
│   │   │   └── external_api.py
│   │   ├── api/
│   │   ├── training/
│   │   ├── data/
│   │   ├── utils/
│   │   └── tests/
│   ├── notebooks/
│   ├── configs/
│   ├── requirements.txt
│   └── Dockerfile
├── demand-forecasting/
│   ├── src/
│   │   ├── models/
│   │   │   ├── arima.py
│   │   │   ├── prophet.py
│   │   │   ├── lstm.py
│   │   │   └── ensemble.py
│   │   ├── features/
│   │   ├── api/
│   │   ├── training/
│   │   ├── data/
│   │   ├── utils/
│   │   └── tests/
│   ├── notebooks/
│   ├── configs/
│   ├── requirements.txt
│   └── Dockerfile
├── shared/
│   ├── feature_store/
│   │   ├── feast/
│   │   │   ├── feature_repo/
│   │   │   │   ├── features/
│   │   │   │   │   ├── user_features.py
│   │   │   │   │   ├── route_features.py
│   │   │   │   │   └── transaction_features.py
│   │   │   │   └── feature_store.yaml
│   │   │   └── scripts/
│   │   └── tecton/ (alternative)
│   ├── ml_utils/
│   │   ├── metrics.py
│   │   ├── model_registry.py
│   │   ├── experiment_tracking.py
│   │   └── data_validation.py
│   ├── api_clients/
│   │   ├── backend_api.py
│   │   ├── data_warehouse.py
│   │   └── external_apis.py
│   └── common/
│       ├── logger.py
│       ├── config.py
│       └── exceptions.py
└── infrastructure/
    ├── mlflow/
    │   ├── docker-compose.yaml
    │   └── mlflow_config.py
    ├── kubeflow/
    │   ├── pipelines/
    │   │   ├── recommendation_pipeline.yaml
    │   │   ├── chatbot_pipeline.yaml
    │   │   └── fraud_pipeline.yaml
    │   └── kfp_components/
    ├── airflow/
    │   ├── dags/
    │   │   ├── data_ingestion.py
    │   │   ├── feature_engineering.py
    │   │   └── model_retraining.py
    │   └── plugins/
    ├── monitoring/
    │   ├── evidently/
    │   │   ├── dashboards/
    │   │   └── reports/
    │   └── prometheus/
    │       └── metrics.yaml
    └── kubernetes/
        ├── deployments/
        │   ├── recommendation-engine.yaml
        │   ├── chatbot-service.yaml
        │   └── fraud-detection.yaml
        └── services/
```

---

## MODEL SPECIFICATIONS

### 1. Recommendation Engine - Neural Collaborative Filtering

**Model Architecture:**
```python
import torch
import torch.nn as nn

class NeuralCF(nn.Module):
    def __init__(self, num_users, num_routes, embedding_dim=128, hidden_layers=[256, 128, 64]):
        super(NeuralCF, self).__init__()
        
        # Embeddings
        self.user_embedding_gmf = nn.Embedding(num_users, embedding_dim)
        self.route_embedding_gmf = nn.Embedding(num_routes, embedding_dim)
        self.user_embedding_mlp = nn.Embedding(num_users, embedding_dim)
        self.route_embedding_mlp = nn.Embedding(num_routes, embedding_dim)
        
        # MLP layers
        mlp_modules = []
        input_size = embedding_dim * 2
        for hidden_size in hidden_layers:
            mlp_modules.append(nn.Linear(input_size, hidden_size))
            mlp_modules.append(nn.ReLU())
            mlp_modules.append(nn.Dropout(0.2))
            input_size = hidden_size
        self.mlp = nn.Sequential(*mlp_modules)
        
        # Prediction layer
        self.predict_layer = nn.Linear(hidden_layers[-1] + embedding_dim, 1)
        
    def forward(self, user_ids, route_ids):
        # GMF part
        user_emb_gmf = self.user_embedding_gmf(user_ids)
        route_emb_gmf = self.route_embedding_gmf(route_ids)
        gmf_output = user_emb_gmf * route_emb_gmf
        
        # MLP part
        user_emb_mlp = self.user_embedding_mlp(user_ids)
        route_emb_mlp = self.route_embedding_mlp(route_ids)
        mlp_input = torch.cat([user_emb_mlp, route_emb_mlp], dim=-1)
        mlp_output = self.mlp(mlp_input)
        
        # Concatenate and predict
        concat = torch.cat([gmf_output, mlp_output], dim=-1)
        prediction = torch.sigmoid(self.predict_layer(concat))
        
        return prediction
```

**Training Configuration:**
```yaml
# configs/model_config.yaml
model:
  name: "neural_cf"
  version: "v2.0"
  embedding_dim: 128
  hidden_layers: [256, 128, 64]
  
training:
  batch_size: 1024
  epochs: 50
  learning_rate: 0.001
  optimizer: "adam"
  loss_function: "binary_crossentropy"
  early_stopping:
    patience: 5
    min_delta: 0.001
  
data:
  train_split: 0.8
  val_split: 0.1
  test_split: 0.1
  negative_sampling_ratio: 4
  
metrics:
  - precision@10
  - recall@10
  - ndcg@10
  - hit_rate@10
  
mlflow:
  tracking_uri: "http://mlflow:5000"
  experiment_name: "recommendation_engine"
```

**Inference API:**
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import mlflow

app = FastAPI(title="Recommendation Engine API")

# Load model
model_uri = "models:/neural_cf/production"
model = mlflow.pytorch.load_model(model_uri)
model.eval()

class RecommendationRequest(BaseModel):
    user_id: str
    top_k: int = 10
    filters: dict = {}

class RecommendationResponse(BaseModel):
    user_id: str
    recommendations: list[dict]
    scores: list[float]
    model_version: str

@app.post("/recommend", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    try:
        # Get user embedding
        user_idx = user_id_to_idx[request.user_id]
        user_tensor = torch.tensor([user_idx])
        
        # Get all route embeddings
        all_routes = torch.tensor(list(range(num_routes)))
        
        # Predict scores
        with torch.no_grad():
            scores = model(user_tensor.repeat(len(all_routes)), all_routes)
        
        # Get top-k
        top_k_indices = torch.topk(scores.squeeze(), k=request.top_k).indices
        top_k_scores = scores[top_k_indices].tolist()
        
        # Map back to route IDs
        recommendations = [
            {
                "route_id": idx_to_route_id[idx.item()],
                "score": score
            }
            for idx, score in zip(top_k_indices, top_k_scores)
        ]
        
        return RecommendationResponse(
            user_id=request.user_id,
            recommendations=recommendations,
            scores=top_k_scores,
            model_version="v2.0"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": model is not None}
```

**Acceptance Criteria:**
```
✅ AC1: Model achieves precision@10 > 0.25 on test set
✅ AC2: Inference latency < 100ms (p95) for top-10 recommendations
✅ AC3: Model supports 1M+ users, 10k+ routes
✅ AC4: Negative sampling ratio = 4 (4 negatives per positive)
✅ AC5: Cold start handled (fallback to popularity-based)
✅ AC6: Model retraining weekly (automated pipeline)
✅ AC7: A/B test shows CTR improvement > 15% vs baseline
✅ AC8: Model artifacts versioned in MLflow
```

---

### 2. Chatbot Service - Intent Classification

**Model Architecture (BERT-based):**
```python
from transformers import AutoModel, AutoTokenizer
import torch.nn as nn

class IntentClassifier(nn.Module):
    def __init__(self, num_intents=25, bert_model="vinai/phobert-base"):
        super(IntentClassifier, self).__init__()
        
        self.bert = AutoModel.from_pretrained(bert_model)
        self.dropout = nn.Dropout(0.3)
        self.classifier = nn.Linear(self.bert.config.hidden_size, num_intents)
        
    def forward(self, input_ids, attention_mask):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled_output = outputs.pooler_output
        pooled_output = self.dropout(pooled_output)
        logits = self.classifier(pooled_output)
        return logits
```

**Intent Schema:**
```json
{
  "intents": [
    {
      "name": "search_route",
      "examples": [
        "Tìm xe từ Hà Nội đi Sài Gòn",
        "Có xe nào từ HN về SG không?",
        "Xe đi TPHCM giờ nào?"
      ]
    },
    {
      "name": "booking_inquiry",
      "examples": [
        "Làm sao để đặt vé?",
        "Tôi muốn book vé xe",
        "Đặt vé như thế nào?"
      ]
    },
    {
      "name": "booking_status",
      "examples": [
        "Kiểm tra vé của tôi",
        "Mã đặt vé VXV123456 thế nào rồi?",
        "Xem thông tin booking"
      ]
    },
    {
      "name": "cancellation_request",
      "examples": [
        "Hủy vé",
        "Tôi muốn cancel booking",
        "Làm sao để hủy đặt vé?"
      ]
    },
    {
      "name": "price_inquiry",
      "examples": [
        "Giá vé bao nhiêu?",
        "Chi phí đi từ HN về SG?",
        "Xe này bao tiền?"
      ]
    }
  ]
}
```

**Training Script:**
```python
import torch
from torch.utils.data import DataLoader
from transformers import AutoTokenizer, AdamW
from sklearn.metrics import classification_report

# Load data
train_dataset = IntentDataset("data/intents/train.json")
val_dataset = IntentDataset("data/intents/val.json")

train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=32)

# Initialize model
model = IntentClassifier(num_intents=25)
tokenizer = AutoTokenizer.from_pretrained("vinai/phobert-base")
optimizer = AdamW(model.parameters(), lr=2e-5)
criterion = nn.CrossEntropyLoss()

# Training loop
for epoch in range(10):
    model.train()
    total_loss = 0
    
    for batch in train_loader:
        input_ids = batch["input_ids"]
        attention_mask = batch["attention_mask"]
        labels = batch["labels"]
        
        optimizer.zero_grad()
        logits = model(input_ids, attention_mask)
        loss = criterion(logits, labels)
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
    
    # Validation
    model.eval()
    predictions, true_labels = [], []
    
    with torch.no_grad():
        for batch in val_loader:
            logits = model(batch["input_ids"], batch["attention_mask"])
            preds = torch.argmax(logits, dim=-1)
            predictions.extend(preds.cpu().numpy())
            true_labels.extend(batch["labels"].cpu().numpy())
    
    print(f"Epoch {epoch+1}: Loss = {total_loss/len(train_loader):.4f}")
    print(classification_report(true_labels, predictions))

# Save model
torch.save(model.state_dict(), "models/intent_classifier_v1.pt")
```

**Chatbot API:**
```python
from fastapi import FastAPI
from pydantic import BaseModel
import openai

app = FastAPI(title="Chatbot API")

class ChatRequest(BaseModel):
    session_id: str
    message: str
    context: dict = {}

class ChatResponse(BaseModel):
    message: str
    intent: str
    confidence: float
    suggestions: list[str] = []
    actions: list[dict] = []

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # 1. Intent classification
    intent, confidence = classify_intent(request.message)
    
    # 2. Entity extraction
    entities = extract_entities(request.message)
    
    # 3. Dialogue management
    if intent == "search_route":
        if all(k in entities for k in ["origin", "destination"]):
            # Trigger search
            response = f"Đang tìm xe từ {entities['origin']} đến {entities['destination']}..."
            actions = [{
                "type": "search",
                "payload": entities
            }]
        else:
            # Ask for missing info
            response = "Bạn muốn đi từ đâu và đến đâu?"
            suggestions = ["Hà Nội", "Sài Gòn", "Đà Nẵng"]
            actions = []
    
    elif intent == "booking_status":
        if "booking_code" in entities:
            response = f"Đang kiểm tra mã {entities['booking_code']}..."
            actions = [{
                "type": "check_booking",
                "payload": {"code": entities["booking_code"]}
            }]
        else:
            response = "Bạn cho mình mã đặt vé nhé (VD: VXV123456)"
            actions = []
    
    else:
        # Fallback to LLM
        response = await call_llm(request.message, request.context)
        actions = []
    
    return ChatResponse(
        message=response,
        intent=intent,
        confidence=confidence,
        suggestions=suggestions,
        actions=actions
    )

async def call_llm(message: str, context: dict) -> str:
    prompt = f"""
You are a customer support agent for VeXeViet, a bus booking platform.
User message: {message}
Context: {context}

Provide a helpful, concise response in Vietnamese.
"""
    
    response = await openai.ChatCompletion.acreate(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=150
    )
    
    return response.choices[0].message.content
```

**Acceptance Criteria:**
```
✅ AC1: Intent classification accuracy > 90% on test set
✅ AC2: Response latency < 500ms (p95) for intent classification
✅ AC3: LLM fallback latency < 2s (p95)
✅ AC4: Multi-turn conversations supported (context maintained)
✅ AC5: 25+ intents covered (search, booking, cancellation, pricing, etc.)
✅ AC6: Entity extraction F1 > 0.85 (locations, dates, booking codes)
✅ AC7: Safety filter prevents harmful/inappropriate responses
✅ AC8: A/B test shows resolution rate > 70%
```

---

### 3. Smart Pricing - Demand Forecasting

**Model Architecture (Prophet + LSTM Ensemble):**
```python
from prophet import Prophet
import torch.nn as nn

class DemandForecaster:
    def __init__(self):
        # Prophet for seasonality & trends
        self.prophet_model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05
        )
        
        # LSTM for short-term patterns
        self.lstm_model = LSTMForecaster(
            input_size=20,
            hidden_size=128,
            num_layers=2,
            output_size=1
        )
        
    def train_prophet(self, df):
        self.prophet_model.fit(df)
        
    def train_lstm(self, X_train, y_train):
        # Training logic
        pass
        
    def predict(self, horizon=7):
        # Prophet prediction
        future = self.prophet_model.make_future_dataframe(periods=horizon)
        prophet_pred = self.prophet_model.predict(future)
        
        # LSTM prediction
        lstm_pred = self.lstm_model.predict(horizon)
        
        # Ensemble (weighted average)
        final_pred = 0.6 * prophet_pred['yhat'] + 0.4 * lstm_pred
        
        return final_pred

class LSTMForecaster(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, output_size):
        super(LSTMForecaster, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)
        
    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        output = self.fc(lstm_out[:, -1, :])
        return output
```

**Feature Engineering:**
```python
def create_demand_features(df):
    features = df.copy()
    
    # Time features
    features['day_of_week'] = df['date'].dt.dayofweek
    features['day_of_month'] = df['date'].dt.day
    features['month'] = df['date'].dt.month
    features['is_weekend'] = df['date'].dt.dayofweek.isin([5, 6]).astype(int)
    
    # Holiday features
    features['is_holiday'] = df['date'].isin(vietnam_holidays).astype(int)
    features['days_to_holiday'] = df['date'].apply(lambda x: min([
        (h - x).days for h in vietnam_holidays if h > x
    ] or [365]))
    
    # Lag features
    for lag in [1, 7, 14, 30]:
        features[f'demand_lag_{lag}'] = df['demand'].shift(lag)
    
    # Rolling features
    for window in [7, 14, 30]:
        features[f'demand_rolling_mean_{window}'] = df['demand'].rolling(window).mean()
        features[f'demand_rolling_std_{window}'] = df['demand'].rolling(window).std()
    
    # Route features
    features['origin_popularity'] = df.groupby('origin')['demand'].transform('mean')
    features['destination_popularity'] = df.groupby('destination')['demand'].transform('mean')
    
    # Weather features (external API)
    features = features.merge(weather_data, on='date', how='left')
    
    return features
```

**Pricing Optimization (Reinforcement Learning):**
```python
import gym
from stable_baselines3 import PPO

class PricingEnv(gym.Env):
    def __init__(self, demand_forecaster):
        super(PricingEnv, self).__init__()
        self.demand_forecaster = demand_forecaster
        
        # Action space: price multiplier (0.8 to 1.5)
        self.action_space = gym.spaces.Box(low=0.8, high=1.5, shape=(1,))
        
        # Observation space: demand forecast, current occupancy, competitor prices
        self.observation_space = gym.spaces.Box(low=0, high=np.inf, shape=(10,))
        
    def step(self, action):
        price_multiplier = action[0]
        new_price = self.base_price * price_multiplier
        
        # Simulate demand response (price elasticity)
        predicted_demand = self.demand_forecaster.predict(price=new_price)
        
        # Calculate revenue
        revenue = new_price * min(predicted_demand, self.capacity)
        
        # Penalty for empty seats or overbooking
        occupancy_penalty = abs(predicted_demand - self.capacity) * 10
        
        reward = revenue - occupancy_penalty
        
        return self._get_obs(), reward, False, {}
    
    def _get_obs(self):
        return np.array([
            self.demand_forecast,
            self.current_occupancy,
            self.competitor_avg_price,
            self.days_to_departure,
            # ... more features
        ])

# Train RL agent
env = PricingEnv(demand_forecaster)
model = PPO("MlpPolicy", env, verbose=1)
model.learn(total_timesteps=100000)
model.save("pricing_agent_v1")
```

**Acceptance Criteria:**
```
✅ AC1: Demand forecast MAPE < 10% (7-day horizon)
✅ AC2: Pricing optimization increases revenue by > 15%
✅ AC3: Occupancy rate improves to > 85%
✅ AC4: Forecasts updated daily (automated pipeline)
✅ AC5: RL agent converges (stable policy, no oscillations)
✅ AC6: Price constraints respected (min/max prices)
✅ AC7: Competitor price monitoring (web scraping, daily)
✅ AC8: A/B test shows revenue lift vs rule-based pricing
```

---

### 4. Fraud Detection - Anomaly Detection

**Model Architecture (Autoencoder + XGBoost):**
```python
import torch.nn as nn
from xgboost import XGBClassifier

class FraudAutoencoder(nn.Module):
    def __init__(self, input_dim=50, encoding_dim=10):
        super(FraudAutoencoder, self).__init__()
        
        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 30),
            nn.ReLU(),
            nn.Linear(30, encoding_dim),
            nn.ReLU()
        )
        
        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(encoding_dim, 30),
            nn.ReLU(),
            nn.Linear(30, input_dim),
            nn.Sigmoid()
        )
        
    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

class FraudDetector:
    def __init__(self):
        # Autoencoder for anomaly detection (unsupervised)
        self.autoencoder = FraudAutoencoder()
        
        # XGBoost for fraud classification (supervised)
        self.xgb_model = XGBClassifier(
            max_depth=6,
            learning_rate=0.1,
            n_estimators=100,
            scale_pos_weight=10  # Handle class imbalance
        )
        
    def train_autoencoder(self, X_normal):
        # Train only on normal transactions
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(self.autoencoder.parameters(), lr=0.001)
        
        for epoch in range(50):
            optimizer.zero_grad()
            reconstructed = self.autoencoder(X_normal)
            loss = criterion(reconstructed, X_normal)
            loss.backward()
            optimizer.step()
    
    def train_xgb(self, X_train, y_train):
        self.xgb_model.fit(X_train, y_train)
    
    def predict_risk_score(self, X):
        # Autoencoder reconstruction error
        with torch.no_grad():
            reconstructed = self.autoencoder(X)
            reconstruction_error = torch.mean((X - reconstructed) ** 2, dim=1)
        
        # XGBoost fraud probability
        fraud_proba = self.xgb_model.predict_proba(X)[:, 1]
        
        # Ensemble score (weighted average)
        risk_score = 0.4 * reconstruction_error + 0.6 * fraud_proba
        
        return risk_score
```

**Feature Engineering:**
```python
def create_fraud_features(transaction):
    features = {}
    
    # Transaction features
    features['amount'] = transaction['amount']
    features['amount_percentile'] = get_user_amount_percentile(transaction)
    features['is_large_amount'] = int(transaction['amount'] > 5000000)  # 5M VND
    
    # Velocity features
    features['txn_count_last_hour'] = count_user_txns(transaction['user_id'], hours=1)
    features['txn_count_last_day'] = count_user_txns(transaction['user_id'], hours=24)
    features['txn_amount_last_day'] = sum_user_txn_amounts(transaction['user_id'], hours=24)
    
    # Device features
    features['is_new_device'] = int(transaction['device_id'] not in user_devices)
    features['device_changes_last_week'] = count_device_changes(transaction['user_id'], days=7)
    
    # Geo features
    features['ip_distance'] = calculate_distance(transaction['ip_address'], user_last_ip)
    features['is_foreign_ip'] = int(not is_vietnam_ip(transaction['ip_address']))
    
    # Behavioral features
    features['unusual_time'] = int(transaction['hour'] in [0, 1, 2, 3, 4])  # Late night
    features['payment_method_change'] = int(transaction['payment_method'] != user_usual_method)
    
    # Account features
    features['account_age_days'] = (datetime.now() - transaction['user_created_at']).days
    features['is_new_account'] = int(features['account_age_days'] < 7)
    features['booking_success_rate'] = calculate_user_success_rate(transaction['user_id'])
    
    return features
```

**Rule Engine:**
```python
class FraudRuleEngine:
    def __init__(self):
        self.rules = [
            self.velocity_check,
            self.geo_check,
            self.blacklist_check,
            self.amount_check
        ]
    
    def velocity_check(self, transaction):
        # More than 5 transactions in 1 hour
        if transaction['txn_count_last_hour'] > 5:
            return {"risk": "HIGH", "reason": "Velocity check failed"}
        return None
    
    def geo_check(self, transaction):
        # IP location change > 500km in < 1 hour
        if transaction['ip_distance'] > 500 and transaction['time_since_last_txn'] < 3600:
            return {"risk": "HIGH", "reason": "Suspicious location change"}
        return None
    
    def blacklist_check(self, transaction):
        # Check email/phone/IP blacklist
        if is_blacklisted(transaction['email']):
            return {"risk": "CRITICAL", "reason": "Blacklisted email"}
        return None
    
    def amount_check(self, transaction):
        # First transaction > 10M VND
        if transaction['is_first_booking'] and transaction['amount'] > 10000000:
            return {"risk": "MEDIUM", "reason": "Large first transaction"}
        return None
    
    def evaluate(self, transaction):
        for rule in self.rules:
            result = rule(transaction)
            if result:
                return result
        return {"risk": "LOW", "reason": "All rules passed"}
```

**Fraud Scoring API:**
```python
from fastapi import FastAPI

app = FastAPI(title="Fraud Detection API")

@app.post("/score")
async def score_transaction(transaction: dict):
    # Extract features
    features = create_fraud_features(transaction)
    
    # Rule engine check (fast path)
    rule_result = rule_engine.evaluate(transaction)
    if rule_result['risk'] in ['HIGH', 'CRITICAL']:
        return {
            "risk_score": 100,
            "risk_level": rule_result['risk'],
            "reason": rule_result['reason'],
            "action": "BLOCK"
        }
    
    # ML model prediction
    X = torch.tensor([list(features.values())], dtype=torch.float32)
    risk_score = fraud_detector.predict_risk_score(X)[0]
    
    # Determine action
    if risk_score > 0.8:
        action = "BLOCK"
        risk_level = "HIGH"
    elif risk_score > 0.5:
        action = "REVIEW"
        risk_level = "MEDIUM"
    else:
        action = "ALLOW"
        risk_level = "LOW"
    
    return {
        "risk_score": float(risk_score * 100),
        "risk_level": risk_level,
        "action": action,
        "features": features
    }

@app.post("/feedback")
async def feedback(transaction_id: str, is_fraud: bool):
    # Update training data with analyst feedback
    await save_fraud_label(transaction_id, is_fraud)
    
    # Trigger retraining if enough new labels
    new_labels_count = await count_unlabeled_since_last_train()
    if new_labels_count > 1000:
        await trigger_retraining()
    
    return {"status": "success"}
```

**Acceptance Criteria:**
```
✅ AC1: Fraud detection precision > 80%, recall > 70%
✅ AC2: Scoring latency < 100ms (p95)
✅ AC3: False positive rate < 5%
✅ AC4: Rule engine blocks critical fraud instantly (< 50ms)
✅ AC5: Feedback loop: analyst labels → retraining (weekly)
✅ AC6: Model catches 90%+ of known fraud patterns
✅ AC7: A/B test shows fraud loss reduction > 50%
✅ AC8: Explainability: top 3 risk factors returned
```

---

## MLOPS PIPELINE SPECIFICATIONS

### Model Retraining Pipeline (Kubeflow)

```yaml
# kubeflow/pipelines/recommendation_pipeline.yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: recommendation-retraining-
spec:
  entrypoint: recommendation-pipeline
  templates:
  - name: recommendation-pipeline
    steps:
    - - name: data-extraction
        template: extract-data
    - - name: feature-engineering
        template: feature-eng
    - - name: train-model
        template: train
    - - name: evaluate-model
        template: evaluate
    - - name: deploy-model
        template: deploy
        when: "{{steps.evaluate-model.outputs.parameters.accuracy}} > 0.8"
  
  - name: extract-data
    container:
      image: vexeviet/data-extractor:v1
      command: [python, extract_data.py]
      args: ["--start-date", "{{workflow.parameters.start_date}}"]
    outputs:
      artifacts:
      - name: raw-data
        path: /data/raw.parquet
        s3:
          key: raw-data/{{workflow.uid}}.parquet
  
  - name: feature-eng
    inputs:
      artifacts:
      - name: raw-data
        path: /data/raw.parquet
    container:
      image: vexeviet/feature-eng:v1
      command: [python, feature_engineering.py]
    outputs:
      artifacts:
      - name: features
        path: /data/features.parquet
  
  - name: train
    inputs:
      artifacts:
      - name: features
        path: /data/features.parquet
    container:
      image: vexeviet/recommendation-trainer:v1
      command: [python, train.py]
      resources:
        limits:
          nvidia.com/gpu: 1
    outputs:
      artifacts:
      - name: model
        path: /models/model.pt
  
  - name: evaluate
    inputs:
      artifacts:
      - name: model
        path: /models/model.pt
      - name: features
        path: /data/features.parquet
    container:
      image: vexeviet/model-evaluator:v1
      command: [python, evaluate.py]
    outputs:
      parameters:
      - name: accuracy
        valueFrom:
          path: /metrics/accuracy.txt
      - name: precision
        valueFrom:
          path: /metrics/precision.txt
  
  - name: deploy
    inputs:
      artifacts:
      - name: model
        path: /models/model.pt
    container:
      image: vexeviet/model-deployer:v1
      command: [python, deploy.py]
      args: ["--environment", "production"]
```

**Acceptance Criteria:**
```
✅ AC1: Retraining pipeline runs weekly (automated)
✅ AC2: Pipeline completes in < 4 hours
✅ AC3: Model deployed only if accuracy > 0.8
✅ AC4: Rollback to previous version if deployment fails
✅ AC5: All artifacts versioned (data, features, models)
✅ AC6: Slack notification on pipeline success/failure
✅ AC7: GPU utilization > 80% during training
✅ AC8: Pipeline logs centralized (ELK stack)
```

---

## MONITORING & OBSERVABILITY

### Model Performance Dashboard (Evidently AI)

```python
from evidently import ColumnMapping
from evidently.dashboard import Dashboard
from evidently.dashboard.tabs import DataDriftTab, RegressionPerformanceTab

# Create dashboard
dashboard = Dashboard(tabs=[
    DataDriftTab(),
    RegressionPerformanceTab()
])

# Generate report
dashboard.calculate(
    reference_data=train_data,
    current_data=production_data,
    column_mapping=ColumnMapping(
        prediction='predicted_score',
        target='actual_score',
        numerical_features=['price', 'distance', 'duration'],
        categorical_features=['bus_type', 'operator']
    )
)

# Save HTML report
dashboard.save("reports/model_drift_report.html")

# Send alerts if drift detected
if dashboard.get_drift_score() > 0.5:
    send_alert("Model drift detected! Drift score: {:.2f}".format(
        dashboard.get_drift_score()
    ))
```

**Prometheus Metrics:**
```python
from prometheus_client import Counter, Histogram, Gauge

# Inference metrics
inference_count = Counter('model_inference_total', 'Total inference requests', ['model', 'version'])
inference_latency = Histogram('model_inference_latency_seconds', 'Inference latency', ['model'])
prediction_distribution = Histogram('model_prediction_distribution', 'Distribution of predictions', ['model'])

# Model performance
model_accuracy = Gauge('model_accuracy', 'Model accuracy', ['model', 'version'])
model_drift_score = Gauge('model_drift_score', 'Data drift score', ['model'])

# Business metrics
recommendation_ctr = Gauge('recommendation_ctr', 'Click-through rate', ['model'])
booking_conversion = Gauge('booking_conversion', 'Conversion rate', ['source'])

# Example usage
@app.post("/recommend")
async def recommend(request: RecommendationRequest):
    start_time = time.time()
    
    predictions = model.predict(request)
    
    inference_count.labels(model='neural_cf', version='v2.0').inc()
    inference_latency.labels(model='neural_cf').observe(time.time() - start_time)
    prediction_distribution.labels(model='neural_cf').observe(predictions[0])
    
    return predictions
```

**Acceptance Criteria:**
```
✅ AC1: Drift detection runs daily (automated)
✅ AC2: Alert triggered if drift score > 0.5
✅ AC3: Dashboards accessible via Grafana
✅ AC4: Metrics retention: 90 days
✅ AC5: Business metrics tracked (CTR, conversion, revenue)
✅ AC6: Model latency p95, p99 monitored
✅ AC7: PagerDuty alert if accuracy drops > 10%
✅ AC8: Weekly performance reports emailed to stakeholders
```

---

**Document Owner:** AI/ML Tech Lead + Data Science Team  
**Last Updated:** January 12, 2026  
**Status:** Ready for Implementation  
**Next Review:** PI 1 Planning
