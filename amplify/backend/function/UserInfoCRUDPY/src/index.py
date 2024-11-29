import json
import boto3
import time
from datetime import datetime, timedelta

current_time = datetime.now()


def query_userinfo(dynamodb, sub):
    response = dynamodb.get_item(
        TableName='UserInfoDB-dev',
        Key={
            'userId': {'S': sub},  # 파티션 키(Cognito UserPool의 개인 SUB 필드 활용)
        }
    )
    return response.get('Item')

def add_new_item(dynamodb, sub):
    future_time = current_time + timedelta(days=3)
    epoch_time = int(future_time.timestamp())
    new_item = {
        'userId': {'S': sub},
        'Bcurrent': {'BOOL': False},
        'Bcnt': {'N': '0'},
        'TTL': {'S': str(epoch_time)}
    }
    dynamodb.put_item(
        TableName='UserInfoDB-dev',
        Item=new_item
    )
    return new_item

def gather_info(sub=None, email=None, **kwargs):
    info = {}
    if sub:
        info['sub'] = sub
    if email:
        info['email'] = email
    info.update(kwargs)
    return info


def handler(event, context):
    try:
        request_body = json.loads(event['body'])
        dynamodb = boto3.client('dynamodb')

        userinfo = gather_info(**request_body)
        sub = userinfo['sub']
        email = userinfo['email']


        user_info = query_userinfo(dynamodb, sub)
        if user_info:
            return {
                'statusCode': 200,
                'body': json.dumps({"UserInfo": user_info})
            }
        else:
            new_user_info = add_new_item(dynamodb, sub)
            return {
                'statusCode': 200,
                'body': json.dumps({"UserInfo": new_user_info})
            }
    except Exception as e:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': str(e)})
        }