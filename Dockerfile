FROM python:3.12-alpine
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
RUN apk add --no-cache gcc musl-dev libffi-dev
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt
COPY . /app
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
